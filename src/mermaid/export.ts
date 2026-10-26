// A Reticulyne diagram view written as a Mermaid flowchart. Pure: a scene
// in, text out, nothing read from the editor or the DOM, so a host can run
// it anywhere. What Mermaid cannot hold (tile positions, device icons) is
// reported as warnings, never as a failure.
//
// Redaction is the caller's: the editor passes a scene already through
// redactScene unless the person opted in (docs/embedding.md, Exports).

import type {
  Connection,
  Connector,
  DiagramView,
  Scene,
  SceneObject,
  Tile
} from 'src/core';
import { readScene } from 'src/scene/read';
import { DRAWINGS } from 'src/icons/drawings';
import { BUILTIN_ICON_PREFIX } from 'src/icons/builtin';
import { CATALOGUE } from 'src/catalogue';
import {
  foldWarnings,
  mermaidWarning,
  type MermaidIssue,
  type MermaidWarningCode
} from './issues';
import {
  DEFAULT_SHAPE,
  MERMAID_SHAPE_PROP,
  shapeByName,
  shapeForDrawing,
  writableShape,
  type MermaidShape
} from './shapes';
import type { FlowDirection } from './parse';

export interface MermaidExportOptions {
  /** The diagram view to write; the first iso or schematic view if absent. */
  view?: string;
  /** Mermaid's layout direction. Default LR. */
  direction?: FlowDirection;
  /**
   * 'classic' (the default) writes only bracket shapes, which every
   * Mermaid renders, GitHub's included; 'extended' writes Mermaid 11's
   * `@{ shape: ... }` for the shapes that have no brackets.
   */
  syntax?: 'classic' | 'extended';
  /** A text box near a zone becomes its title. Default true. */
  zoneTitles?: boolean;
  /** Port names in link labels ("eth1 to wan"). Default false. */
  ports?: boolean;
  /** Wrap the result in a ```mermaid fence, for a Markdown file. */
  markdown?: boolean;
}

export interface MermaidExport {
  text: string;
  warnings: MermaidIssue[];
  stats: { nodes: number; links: number; subgraphs: number };
}

/** A text box within this many tiles of a zone titles it. */
export const ZONE_TITLE_DISTANCE = 3;
/** A note is tied to the nearest node within this many tiles. */
export const NOTE_DISTANCE = 4;
/** Mermaid's own defaults, above which renderers refuse a diagram. */
export const MERMAID_MAX_TEXT = 50_000;
export const MERMAID_MAX_EDGES = 500;
/** The connector width Reticulyne draws by default (src/config.ts). */
const DEFAULT_WIDTH = 10;

// Words Mermaid reads as keywords wherever an id would go.
const RESERVED = new Set([
  'end',
  'graph',
  'flowchart',
  'subgraph',
  'style',
  'linkstyle',
  'classdef',
  'class',
  'click',
  'call',
  'href',
  'default',
  'direction',
  'acctitle',
  'accdescr'
]);

/** Text Mermaid shows as written: entity codes for what it would read. */
export const mermaidText = (text: string): string => {
  return text
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\|/g, '#124;')
    .replace(/`/g, '#96;')
    .replace(/\r?\n/g, '<br/>');
};

/** A scene description (TipTap HTML, or plain text) as plain text. */
export const plainText = (html: string | undefined): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
};

/** Mermaid ids for scene ids: safe, unique, never a keyword. */
class Ids {
  private readonly taken = new Set<string>();
  private readonly byKey = new Map<string, string>();

  get(key: string, wanted: string): string {
    const known = this.byKey.get(key);
    if (known) return known;
    let base = wanted.replace(/[^A-Za-z0-9_]/g, '_') || 'n';
    if (RESERVED.has(base.toLowerCase())) base = `${base}_`;
    let id = base;
    for (let i = 2; this.taken.has(id); i += 1) id = `${base}_${i}`;
    this.taken.add(id);
    this.byKey.set(key, id);
    return id;
  }
}

interface Container {
  key: string;
  title: string;
  members: Set<string>;
  fill?: string;
  dashed?: boolean;
  parent?: Container;
  children: Container[];
  nodes: string[];
}

const inRect = (tile: Tile, from: Tile, to: Tile, pad = 0) => {
  const [x0, x1] = [Math.min(from.x, to.x), Math.max(from.x, to.x)];
  const [y0, y1] = [Math.min(from.y, to.y), Math.max(from.y, to.y)];
  return (
    tile.x >= x0 - pad &&
    tile.x <= x1 + pad &&
    tile.y >= y0 - pad &&
    tile.y <= y1 + pad
  );
};

const distance = (a: Tile, b: Tile) => {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

const iconName = (scene: Scene, icon: string | undefined) => {
  if (!icon) return undefined;
  const own = scene.icons?.find((i) => {
    return i.id === icon;
  });
  if (own) return own.name;
  if (icon.startsWith(BUILTIN_ICON_PREFIX)) {
    return DRAWINGS[icon.slice(BUILTIN_ICON_PREFIX.length)]?.name;
  }
  return undefined;
};

/** The drawing an object draws with: its icon's, else its element's. */
const drawingOf = (object: SceneObject): string | undefined => {
  if (object.icon?.startsWith(BUILTIN_ICON_PREFIX)) {
    return object.icon.slice(BUILTIN_ICON_PREFIX.length);
  }
  if (object.element) {
    const item = CATALOGUE.items.find((i) => {
      return i.id === object.element;
    });
    return item?.drawing ?? object.element;
  }
  return undefined;
};

/** The shape an object exports as, and whether one was found. */
export const shapeOfObject = (
  object: SceneObject
): { shape: MermaidShape; matched: boolean } => {
  const recorded = object.props?.[MERMAID_SHAPE_PROP];
  if (typeof recorded === 'string') {
    const shape = shapeByName(recorded);
    if (shape) return { shape, matched: true };
  }
  const shape = shapeForDrawing(drawingOf(object));
  if (shape) return { shape, matched: true };
  return { shape: shapeByName(DEFAULT_SHAPE)!, matched: false };
};

const nodeText = (id: string, shape: MermaidShape, label: string) => {
  const text = `"${mermaidText(label)}"`;
  if (shape.brackets) {
    return `${id}${shape.brackets[0]}${text}${shape.brackets[1]}`;
  }
  return `${id}@{ shape: ${shape.shape}, label: ${text} }`;
};

/**
 * Writes one diagram view of `scene` as a Mermaid flowchart. `scene` may
 * be a scene or a legacy Reticulyne model (read with readScene); an
 * invalid one throws, as there is nothing to export.
 */
export const sceneToMermaid = (
  input: Scene | unknown,
  options: MermaidExportOptions = {}
): MermaidExport => {
  const read = readScene(input);
  if (!read.ok) {
    throw new Error(
      `Not a diagram: ${read.issues[0]?.message ?? 'invalid scene'}`
    );
  }
  const scene = read.scene;
  const syntax = options.syntax ?? 'classic';
  const warnings: MermaidIssue[] = [];
  const warn = (code: MermaidWarningCode, detail?: string) => {
    warnings.push(mermaidWarning(code, detail));
  };

  const diagramViews = (scene.views ?? []).filter((v) => {
    return v.kind !== 'plan';
  }) as DiagramView[];
  if (
    (scene.views ?? []).some((v) => {
      return v.kind === 'plan';
    })
  ) {
    warn('MMD_PLAN_VIEW_SKIPPED');
  }
  const view =
    diagramViews.find((v) => {
      return v.id === options.view;
    }) ?? diagramViews[0];

  const hidden = new Set(
    (scene.layers ?? [])
      .filter((l) => {
        return l.visible === false;
      })
      .map((l) => {
        return l.id;
      })
  );
  const shown = <T extends { layer?: string }>(list: T[] | undefined) => {
    const all = list ?? [];
    const kept = all.filter((item) => {
      return !item.layer || !hidden.has(item.layer);
    });
    if (kept.length < all.length) warn('MMD_HIDDEN_LAYER_SKIPPED');
    return kept;
  };

  const placements = shown(view?.placements);
  const connectors = shown(view?.connectors);
  const rectangles = shown(view?.rectangles);
  const textBoxes = shown(view?.textBoxes);
  const groups = view?.groups ?? [];
  const objects = new Map(
    scene.objects.map((o) => {
      return [o.id, o];
    })
  );
  const colors = new Map(
    (scene.colors ?? []).map((c) => {
      return [c.id, c.value];
    })
  );

  const ids = new Ids();
  const lines: string[] = [];
  const styles: string[] = [];
  const nodeLines = new Map<string, string>();
  const tileOf = new Map<string, Tile>();
  let positioned = 0;

  // ---------- nodes ----------
  for (const p of placements) {
    const object = objects.get(p.object);
    if (!object || nodeLines.has(p.object)) continue;
    const id = ids.get(`o:${object.id}`, object.id);
    const { shape, matched } = shapeOfObject(object);
    if (!matched && (object.icon || object.element)) warn('MMD_ICON_LOST');
    const label =
      object.name ||
      iconName(scene, object.icon) ||
      object.element ||
      'Untitled';
    nodeLines.set(object.id, nodeText(id, writableShape(shape, syntax), label));
    tileOf.set(object.id, p.tile);
    positioned += 1;
  }

  // ---------- collapsed groups: one node stands for all ----------
  const groupById = new Map(
    groups.map((g) => {
      return [g.id, g];
    })
  );
  const groupChain = (gid: string | undefined) => {
    const chain: string[] = [];
    let cur = gid ? groupById.get(gid) : undefined;
    while (cur && !chain.includes(cur.id)) {
      chain.push(cur.id);
      cur = cur.group ? groupById.get(cur.group) : undefined;
    }
    return chain;
  };
  const stand = new Map<string, string>(); // object id -> collapsed node id
  for (const p of placements) {
    const chain = groupChain(p.group);
    // The outermost collapsed group hides everything inside it.
    const collapsed = [...chain].reverse().find((g) => {
      return groupById.get(g)?.collapsed;
    });
    if (!collapsed) continue;
    const gid = ids.get(`g:${collapsed}`, collapsed);
    if (!nodeLines.has(`g:${collapsed}`)) {
      const name = groupById.get(collapsed)?.name || 'Group';
      nodeLines.set(
        `g:${collapsed}`,
        nodeText(gid, shapeByName('fr-rect')!, name)
      );
      tileOf.set(`g:${collapsed}`, p.tile);
    }
    stand.set(p.object, `g:${collapsed}`);
    nodeLines.delete(p.object);
  }
  const nodeKey = (objectId: string) => {
    return stand.get(objectId) ?? objectId;
  };
  const mermaidId = (key: string) => {
    return key.startsWith('g:')
      ? ids.get(key, key.slice(2))
      : key.startsWith('j:')
        ? ids.get(key, `j_${key.slice(2)}`)
        : ids.get(`o:${key}`, key);
  };

  // ---------- containers: groups (explicit) and zones (by tile) ----------
  const containers: Container[] = [];
  for (const g of groups) {
    if (stand.size && [...stand.values()].includes(`g:${g.id}`)) continue;
    const members = new Set(
      placements
        .filter((p) => {
          return groupChain(p.group).includes(g.id) && nodeLines.has(p.object);
        })
        .map((p) => {
          return p.object;
        })
    );
    if (members.size) {
      containers.push({
        key: `group:${g.id}`,
        title: g.name ?? '',
        members,
        dashed: true,
        children: [],
        nodes: []
      });
    }
  }
  const zones = rectangles.filter((r) => {
    return [...tileOf.entries()].some(([key, tile]) => {
      return nodeLines.has(key) && inRect(tile, r.from, r.to);
    });
  });
  // Each text box titles the zone nearest it (the smaller of two equally
  // near), and each zone takes the first text box that chose it.
  const titles = new Map<string, string>();
  const usedText = new Set<string>();
  if (options.zoneTitles !== false) {
    for (const t of textBoxes) {
      const best = zones
        .map((r) => {
          const dx = Math.max(
            Math.min(r.from.x, r.to.x) - t.tile.x,
            0,
            t.tile.x - Math.max(r.from.x, r.to.x)
          );
          const dy = Math.max(
            Math.min(r.from.y, r.to.y) - t.tile.y,
            0,
            t.tile.y - Math.max(r.from.y, r.to.y)
          );
          const area =
            (Math.abs(r.to.x - r.from.x) + 1) *
            (Math.abs(r.to.y - r.from.y) + 1);
          return { r, d: Math.max(dx, dy), area };
        })
        .filter((z) => {
          return z.d <= ZONE_TITLE_DISTANCE && !titles.has(z.r.id);
        })
        .sort((a, b) => {
          return a.d - b.d || a.area - b.area;
        })[0];
      if (best) {
        titles.set(best.r.id, t.content);
        usedText.add(t.id);
      }
    }
  }
  for (const r of zones) {
    const members = new Set(
      [...tileOf.entries()]
        .filter(([key, tile]) => {
          return nodeLines.has(key) && inRect(tile, r.from, r.to);
        })
        .map(([key]) => {
          return key;
        })
    );
    containers.push({
      key: `zone:${r.id}`,
      title: titles.get(r.id) ?? '',
      members,
      fill: r.colorValue ?? (r.color ? colors.get(r.color) : undefined),
      children: [],
      nodes: []
    });
  }
  // Nest: a container's parent is the smallest one holding all its nodes.
  const bySize = [...containers].sort((a, b) => {
    return a.members.size - b.members.size;
  });
  for (const c of bySize) {
    c.parent = bySize.find((o) => {
      return (
        o !== c &&
        o.members.size >= c.members.size &&
        [...c.members].every((m) => {
          return o.members.has(m);
        }) &&
        // Two containers with the same nodes: the earlier one is outside.
        (o.members.size > c.members.size ||
          containers.indexOf(o) < containers.indexOf(c))
      );
    });
    c.parent?.children.push(c);
  }
  // A node belongs to the smallest container holding it.
  const home = new Map<string, Container>();
  for (const c of bySize) {
    for (const m of c.members) if (!home.has(m)) home.set(m, c);
  }
  for (const [key, c] of home) c.nodes.push(key);

  // ---------- notes: text boxes no zone took ----------
  const notes: string[] = [];
  // Tie lines go after the real links, so linkStyle numbers count those.
  const ties: string[] = [];
  for (const t of textBoxes) {
    if (usedText.has(t.id)) continue;
    warn('MMD_TEXT_AS_NOTE');
    const id = ids.get(`t:${t.id}`, `note_${t.id}`);
    const shape = writableShape(shapeByName('text')!, syntax);
    notes.push(nodeText(id, shape, t.content));
    const nearest = [...tileOf.entries()]
      .filter(([key]) => {
        return nodeLines.has(key);
      })
      .map(([key, tile]) => {
        return { key, d: distance(tile, t.tile) };
      })
      .filter((n) => {
        return n.d <= NOTE_DISTANCE;
      })
      .sort((a, b) => {
        return a.d - b.d;
      })[0];
    if (nearest) ties.push(`${id} ~~~ ${mermaidId(nearest.key)}`);
  }

  // ---------- links ----------
  const anchorsById = new Map<string, Connector['anchors'][number]>();
  for (const c of connectors) {
    for (const a of c.anchors) anchorsById.set(a.id, a);
  }
  const junctions = new Map<string, string>();
  const endOf = (anchor: Connector['anchors'][number]): string | undefined => {
    const seen = new Set<string>();
    let cur: Connector['anchors'][number] | undefined = anchor;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      const ref = cur.ref as {
        object?: string;
        anchor?: string;
        tile?: Tile;
      };
      if (ref.object) {
        return nodeLines.has(nodeKey(ref.object))
          ? nodeKey(ref.object)
          : undefined;
      }
      if (ref.anchor) {
        cur = anchorsById.get(ref.anchor);
        continue;
      }
      break;
    }
    // A free end, or a waypoint other connectors join: a junction node.
    const key = `j:${cur?.id ?? anchor.id}`;
    if (!junctions.has(key)) {
      warn('MMD_FREE_CONNECTOR_END');
      const id = mermaidId(key);
      junctions.set(
        key,
        nodeText(id, writableShape(shapeByName('f-circ')!, syntax), ' ')
      );
    }
    return key;
  };

  const connections = new Map<string, Connection>(
    (scene.connections ?? []).map((c) => {
      return [c.id, c];
    })
  );
  const portName = (objectId: string, portId: string | undefined) => {
    if (!portId) return undefined;
    const port = objects.get(objectId)?.ports?.find((p) => {
      return p.id === portId;
    });
    return port?.name ?? port?.id;
  };
  const connectionLabel = (c: Connection | undefined) => {
    if (!c) return '';
    let label = c.name ?? '';
    // A catalogue medium id reads as its name: "Ethernet (copper)".
    const kind =
      CATALOGUE.media.find((m) => {
        return m.id === c.kind;
      })?.name ?? c.kind;
    if (kind) label = label ? `${label} (${kind})` : kind;
    if (options.ports) {
      const from = portName(c.from, c.fromPort);
      const to = portName(c.to, c.toPort);
      if (from || to) {
        const ports = `${from ?? '?'} to ${to ?? '?'}`;
        label = label ? `${label}, ${ports}` : ports;
      }
    }
    return label;
  };

  const edges: string[] = [];
  const linkStyles: string[] = [];
  const animate: string[] = [];
  let edgeCount = 0;
  const drawn = new Set<string>();
  for (const c of connectors) {
    const first = c.anchors[0];
    const last = c.anchors[c.anchors.length - 1];
    let from = endOf(first);
    let to = endOf(last);
    if (!from || !to) continue;
    const direction = c.direction ?? 'START_TO_END';
    if (direction === 'END_TO_START') [from, to] = [to, from];
    if (from === to) continue;
    const dotted = c.style === 'DOTTED' || c.style === 'DASHED';
    const thick = !dotted && (c.width ?? DEFAULT_WIDTH) > DEFAULT_WIDTH;
    const head = direction === 'NONE' ? '' : '>';
    const tail = direction === 'BOTH' ? '<' : '';
    const arrow = dotted
      ? `${tail}-.-${head}`
      : thick
        ? `${tail}==${head || '='}`
        : `${tail}--${head || '-'}`;
    const connection = c.connection ? connections.get(c.connection) : undefined;
    if (connection) drawn.add(connection.id);
    const label = plainText(c.description) || connectionLabel(connection) || '';
    const edgeId =
      syntax === 'extended' && c.animated
        ? ids.get(`e:${c.id}`, `e_${c.id}`)
        : '';
    const text = label ? `|"${mermaidText(label)}"|` : '';
    edges.push(
      `${mermaidId(from)} ${edgeId ? `${edgeId}@` : ''}${arrow}${text} ${mermaidId(to)}`
    );
    if (edgeId) animate.push(`${edgeId}@{ animate: true }`);
    const style: string[] = [];
    const color = c.color ? colors.get(c.color) : undefined;
    if (color) style.push(`stroke:${color}`);
    if (c.style === 'DASHED') style.push('stroke-dasharray:6 4');
    if (style.length)
      linkStyles.push(`linkStyle ${edgeCount} ${style.join(',')}`);
    edgeCount += 1;
  }
  // Connections drawn with no connector in this view: a dotted link.
  for (const c of scene.connections ?? []) {
    if (drawn.has(c.id)) continue;
    const from = nodeLines.has(nodeKey(c.from)) ? nodeKey(c.from) : undefined;
    const to = nodeLines.has(nodeKey(c.to)) ? nodeKey(c.to) : undefined;
    if (!from || !to || from === to) continue;
    warn('MMD_CONNECTION_UNDRAWN');
    const label = connectionLabel(c) || plainText(c.description);
    const text = label ? `|"${mermaidText(label)}"|` : '';
    edges.push(`${mermaidId(from)} -.->${text} ${mermaidId(to)}`);
    edgeCount += 1;
  }

  // ---------- writing ----------
  if (positioned) warn('MMD_POSITION_LOST');
  const indent = (depth: number) => {
    return '  '.repeat(depth);
  };
  const writeContainer = (c: Container, depth: number) => {
    const id = ids.get(c.key, c.key.replace(/^(group|zone):/, ''));
    const title = c.title ? ` ["${mermaidText(c.title)}"]` : ' [" "]';
    lines.push(`${indent(depth)}subgraph ${id}${title}`);
    for (const child of c.children) writeContainer(child, depth + 1);
    for (const key of c.nodes) {
      lines.push(`${indent(depth + 1)}${nodeLines.get(key)}`);
    }
    lines.push(`${indent(depth)}end`);
    if (c.fill) styles.push(`style ${id} fill:${c.fill}`);
    else if (c.dashed) styles.push(`style ${id} stroke-dasharray:4 4`);
  };

  const direction = options.direction ?? 'LR';
  const out: string[] = [];
  if (scene.title) {
    out.push('---', `title: ${JSON.stringify(scene.title)}`, '---');
  }
  out.push(`flowchart ${direction}`);
  for (const [key, line] of nodeLines) {
    if (!home.has(key)) lines.push(`  ${line}`);
  }
  for (const c of containers) if (!c.parent) writeContainer(c, 1);
  for (const line of junctions.values()) lines.push(`  ${line}`);
  for (const line of notes) lines.push(`  ${line}`);
  out.push(...lines);
  for (const e of edges) out.push(`  ${e}`);
  for (const t of ties) out.push(`  ${t}`);
  for (const a of animate) out.push(`  ${a}`);
  for (const s of styles) out.push(`  ${s}`);
  for (const s of linkStyles) out.push(`  ${s}`);
  let text = `${out.join('\n')}\n`;
  if (text.length > MERMAID_MAX_TEXT || edgeCount > MERMAID_MAX_EDGES) {
    warn('MMD_TOO_BIG_FOR_MERMAID');
  }
  if (options.markdown) text = `\`\`\`mermaid\n${text}\`\`\`\n`;
  return {
    text,
    warnings: foldWarnings(warnings),
    stats: {
      nodes: nodeLines.size + junctions.size,
      links: edgeCount,
      subgraphs: containers.length
    }
  };
};
