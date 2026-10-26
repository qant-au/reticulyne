// A Mermaid flowchart as a Reticulyne scene: one node an object, one link
// a connector, one subgraph a group, laid out on tiles (layout.ts). The
// result is checked against the scene schema before it is handed back, so
// what an import produces always opens.

import {
  SCENE_FORMAT,
  SCENE_LIMITS,
  SCENE_VERSION,
  sceneSchema,
  type Connector,
  type DiagramPlacement,
  type Group,
  type Scene,
  type SceneObject
} from 'src/core';
import { CATALOGUE, itemToSceneObject } from 'src/catalogue';
import { BUILTIN_PACK, drawingIconId } from 'src/icons/builtin';
import {
  foldWarnings,
  isError,
  mermaidError,
  mermaidWarning,
  type MermaidIssue
} from './issues';
import { parseMermaid, type FlowEdge, type Flowchart } from './parse';
import { MERMAID_SHAPE_PROP, shapeByName } from './shapes';
import { layoutFlowchart } from './layout';

export interface MermaidImportOptions {
  /** The scene's title when the flowchart has none. */
  title?: string;
  /** The scene id. Default "mermaid-import". */
  id?: string;
  /** The view to draw in: iso (the default) or the flat schematic view. */
  view?: 'iso' | 'schematic';
}

export interface MermaidImport {
  /** Present when the text imported; absent when there were errors. */
  scene?: Scene;
  issues: MermaidIssue[];
}

/** The width a thick link (`==>`) is drawn at; the default is 10. */
export const THICK_WIDTH = 16;

/** Scene ids for Mermaid ids: [A-Za-z0-9_-], 1-64 long, unique. */
const sceneIds = () => {
  const taken = new Set<string>();
  const byKey = new Map<string, string>();
  return (key: string, wanted: string) => {
    const known = byKey.get(key);
    if (known) return known;
    const base =
      wanted
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 56) || 'node';
    let id = base;
    for (let i = 2; taken.has(id); i += 1) id = `${base}-${i}`;
    taken.add(id);
    byKey.set(key, id);
    return id;
  };
};

/** A Mermaid colour as #rrggbb, or undefined for a name or a function. */
export const hexColour = (value: string | undefined): string | undefined => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value?.trim() ?? '');
  if (!m) return undefined;
  const hex =
    m[1].length === 3
      ? m[1]
          .split('')
          .map((c) => {
            return c + c;
          })
          .join('')
      : m[1];
  return `#${hex.toLowerCase()}`;
};

const nameAndDescription = (label: string) => {
  const oneLine = label.replace(/\s*\n\s*/g, ' ').trim();
  if (oneLine.length <= SCENE_LIMITS.NAME && !label.includes('\n')) {
    return { name: oneLine };
  }
  return {
    name:
      oneLine.length <= SCENE_LIMITS.NAME
        ? oneLine
        : `${oneLine.slice(0, SCENE_LIMITS.NAME - 1)}…`,
    description: label.slice(0, SCENE_LIMITS.DESCRIPTION),
    truncated: oneLine.length > SCENE_LIMITS.NAME
  };
};

const flowItems = new Map(
  CATALOGUE.items
    .filter((i) => {
      return i.family === 'flowchart';
    })
    .map((i) => {
      return [i.drawing!, i];
    })
);

/** A parsed flowchart as a scene, with the warnings the mapping raised. */
export const flowchartToScene = (
  flowchart: Flowchart,
  options: MermaidImportOptions = {}
): MermaidImport => {
  const issues: MermaidIssue[] = [];
  // One namespace for every id the import makes: objects, groups, links.
  const objectId = sceneIds();
  const otherId = objectId;

  // ---------- objects ----------
  const objects: SceneObject[] = [];
  for (const node of flowchart.nodes) {
    const id = objectId(node.id, node.id);
    const shape = shapeByName(node.shape) ?? shapeByName('rect')!;
    const item = flowItems.get(shape.drawing);
    const base: SceneObject = item
      ? itemToSceneObject(item, id)
      : { id, icon: drawingIconId(shape.drawing) };
    const text = nameAndDescription(node.label || node.id);
    if (text.truncated) {
      issues.push(
        mermaidWarning('MMD_LABEL_TRUNCATED', undefined, {
          line: node.line,
          column: node.column
        })
      );
    }
    if (shape.approximate) {
      issues.push(
        mermaidWarning(
          'MMD_SHAPE_APPROXIMATED',
          `The "${shape.shape}" shape has no drawing of its own and uses the nearest one; it exports back as "${shape.shape}".`,
          { line: node.line, column: node.column }
        )
      );
    }
    const object: SceneObject = {
      ...base,
      name: text.name,
      ...(text.description ? { description: text.description } : {}),
      ...(shape.approximate
        ? { props: { ...base.props, [MERMAID_SHAPE_PROP]: shape.shape } }
        : {})
    };
    if (!object.name) delete object.name;
    objects.push(object);
  }
  const nodeIds = new Set(
    flowchart.nodes.map((n) => {
      return n.id;
    })
  );

  // ---------- subgraphs: groups; a link to one goes to its first node ----------
  const subgraphs = new Map(
    flowchart.subgraphs.map((s) => {
      return [s.id, s];
    })
  );
  const firstNode = (
    id: string,
    seen = new Set<string>()
  ): string | undefined => {
    if (nodeIds.has(id)) return id;
    const sg = subgraphs.get(id);
    if (!sg || seen.has(id)) return undefined;
    seen.add(id);
    for (const m of sg.members) {
      const found = firstNode(m, seen);
      if (found) return found;
    }
    return undefined;
  };
  const groupOf = new Map<string, string>(); // node id -> innermost subgraph
  for (const sg of flowchart.subgraphs) {
    for (const m of sg.members) if (nodeIds.has(m)) groupOf.set(m, sg.id);
  }

  // ---------- links ----------
  const links: { edge: FlowEdge; from: string; to: string }[] = [];
  let warnedSubgraph = false;
  for (const edge of flowchart.edges) {
    const from = firstNode(edge.from);
    const to = firstNode(edge.to);
    if ((!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) && !warnedSubgraph) {
      warnedSubgraph = true;
      issues.push(
        mermaidWarning('MMD_SUBGRAPH_LINK', undefined, {
          line: edge.line,
          column: edge.column
        })
      );
    }
    if (!from || !to) continue;
    if (from === to) {
      issues.push(
        mermaidWarning('MMD_SELF_LOOP', undefined, {
          line: edge.line,
          column: edge.column
        })
      );
      continue;
    }
    links.push({ edge, from, to });
  }

  // ---------- layout ----------
  const { tiles } = layoutFlowchart({
    direction: flowchart.direction,
    nodes: flowchart.nodes.map((n) => {
      return n.id;
    }),
    edges: links.map((l) => {
      return { from: l.from, to: l.to, length: l.edge.length };
    }),
    groups: flowchart.subgraphs.map((s) => {
      return {
        id: s.id,
        parent: s.parent,
        nodes: s.members.filter((m) => {
          return groupOf.get(m) === s.id;
        })
      };
    })
  });

  const placements: DiagramPlacement[] = flowchart.nodes.map((n) => {
    const group = groupOf.get(n.id);
    return {
      object: objectId(n.id, n.id),
      tile: tiles.get(n.id)!,
      ...(group ? { group: otherId(`g:${group}`, group) } : {})
    };
  });
  const groups: Group[] = flowchart.subgraphs.map((s) => {
    return {
      id: otherId(`g:${s.id}`, s.id),
      ...(s.title ? { name: s.title.slice(0, SCENE_LIMITS.NAME) } : {}),
      ...(s.parent ? { group: otherId(`g:${s.parent}`, s.parent) } : {})
    };
  });

  const colors = new Map<string, string>();
  const colourId = (hex: string) => {
    if (!colors.has(hex)) colors.set(hex, `mermaid-${colors.size + 1}`);
    return colors.get(hex)!;
  };
  const connectors: Connector[] = [];
  let warnedInvisible = false;
  let warnedEnds = false;
  for (const { edge, from, to } of links) {
    if (edge.stroke === 'invisible') {
      if (!warnedInvisible) {
        warnedInvisible = true;
        issues.push(
          mermaidWarning('MMD_INVISIBLE_LINK', undefined, {
            line: edge.line,
            column: edge.column
          })
        );
      }
      continue;
    }
    const id = otherId(
      `c:${connectors.length}`,
      `link-${connectors.length + 1}`
    );
    const hasStart = edge.start !== 'none';
    const hasEnd = edge.end !== 'none';
    const direction =
      hasStart && hasEnd
        ? 'BOTH'
        : hasEnd
          ? 'START_TO_END'
          : hasStart
            ? 'END_TO_START'
            : 'NONE';
    if (!warnedEnds && (edge.start === 'cross' || edge.end === 'cross')) {
      warnedEnds = true;
      issues.push(
        mermaidWarning('MMD_LINK_END_MARKER', undefined, {
          line: edge.line,
          column: edge.column
        })
      );
    }
    const colour = hexColour(edge.style.stroke);
    const dashed = !!edge.style['stroke-dasharray'];
    const connector: Connector = {
      id,
      anchors: [
        { id: `${id}-a`, ref: { object: objectId(from, from) } },
        { id: `${id}-b`, ref: { object: objectId(to, to) } }
      ],
      direction,
      ...(edge.label
        ? { description: edge.label.slice(0, SCENE_LIMITS.DESCRIPTION) }
        : {}),
      ...(edge.stroke === 'dotted'
        ? { style: dashed ? 'DASHED' : 'DOTTED' }
        : dashed
          ? { style: 'DASHED' }
          : {}),
      ...(edge.stroke === 'thick' ? { width: THICK_WIDTH } : {}),
      ...(edge.start === 'circle' || edge.end === 'circle'
        ? { glyph: 'circle-outline' }
        : {}),
      ...(colour ? { color: colourId(colour) } : {}),
      ...(edge.animated ? { animated: true } : {})
    };
    connectors.push(connector);
  }
  if (connectors.length > SCENE_LIMITS.CONNECTORS) {
    return {
      issues: [
        mermaidError(
          'MMD_TOO_LARGE',
          `The diagram has ${connectors.length} links; a diagram holds at most ${SCENE_LIMITS.CONNECTORS}.`
        )
      ]
    };
  }

  const usedIcons = new Set(
    objects.map((o) => {
      return o.icon;
    })
  );
  const kind = options.view ?? 'iso';
  const scene: Scene = {
    format: SCENE_FORMAT,
    version: SCENE_VERSION,
    id: options.id ?? 'mermaid-import',
    title: (flowchart.title || options.title || 'Imported flowchart').slice(
      0,
      SCENE_LIMITS.NAME
    ),
    ...(flowchart.description
      ? {
          description: flowchart.description.slice(0, SCENE_LIMITS.DESCRIPTION)
        }
      : {}),
    objects,
    views: [
      {
        id: 'flowchart',
        name: 'Flowchart',
        kind,
        placements,
        ...(connectors.length ? { connectors } : {}),
        ...(groups.length ? { groups } : {})
      }
    ],
    icons: BUILTIN_PACK.icons.filter((i) => {
      return usedIcons.has(i.id);
    }),
    ...(colors.size
      ? {
          colors: [...colors].map(([value, id]) => {
            return { id, value };
          })
        }
      : {})
  };

  const checked = sceneSchema.safeParse(scene);
  if (!checked.success) {
    const first = checked.error.issues[0];
    return {
      issues: [
        ...issues,
        mermaidError(
          'MMD_INTERNAL',
          `The diagram read correctly but could not be built (${first.path.join('.')}: ${first.message}). Please report this with the diagram.`
        )
      ]
    };
  }
  return { scene: checked.data, issues: foldWarnings(issues) };
};

/**
 * Mermaid text (or Markdown holding a ```mermaid block) as a scene. Errors
 * leave `scene` absent; warnings say what did not carry across.
 */
export const mermaidToScene = (
  text: string,
  options: MermaidImportOptions = {}
): MermaidImport => {
  const parsed = parseMermaid(text);
  if (!parsed.flowchart || parsed.issues.some(isError)) {
    return { issues: parsed.issues };
  }
  const result = flowchartToScene(parsed.flowchart, options);
  return {
    ...result,
    issues: foldWarnings([...parsed.issues, ...result.issues])
  };
};
