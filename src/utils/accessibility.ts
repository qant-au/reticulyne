// Keyboard and screen-reader access. The order Tab walks the
// objects in, and the words a screen reader is given for each one.
import type { Coords, Icon, ItemReference, ModelItem, View } from 'src/types';
import { getTilePosition } from './coordinates';
import { collapsedBoxes, collapsedGroupMembers } from './collapse';

/** One Tab stop: what it selects, and where it is drawn. */
export interface KeyboardStop {
  key: string;
  refs: ItemReference[];
  tile: Coords;
  /** Set when the stop is a collapsed group's box. */
  groupId?: string;
}

const open = (entry: { locked?: boolean }) => {
  return !entry.locked;
};

/** Where a connector is: its first anchor on a tile or a node. */
const connectorTile = (
  view: View,
  connector: NonNullable<View['connectors']>[number]
): Coords | undefined => {
  for (const anchor of connector.anchors) {
    if (anchor.ref.tile) return anchor.ref.tile;
    const item = view.items.find((i) => {
      return i.id === anchor.ref.item;
    });
    if (item) return item.tile;
  }
  return undefined;
};

/**
 * Every object Tab reaches on `visible` (the view as drawn: hidden layers
 * and collapsed members already left out), in reading order: top to
 * bottom, then left to right, as drawn on screen. Nodes, text boxes,
 * rectangles and collapsed groups come first, connectors after them.
 * Locked objects are skipped, as a click skips them. `full` is the whole
 * view, which a collapsed group's members are read from.
 */
export const keyboardStops = (visible: View, full: View): KeyboardStop[] => {
  const projection = visible.kind ?? 'iso';
  const byReadingOrder = (a: KeyboardStop, b: KeyboardStop) => {
    const pa = getTilePosition({ tile: a.tile, projection });
    const pb = getTilePosition({ tile: b.tile, projection });
    return pa.y - pb.y || pa.x - pb.x;
  };

  const shapes: KeyboardStop[] = [
    ...visible.items.filter(open).map((item) => {
      return {
        key: `ITEM:${item.id}`,
        refs: [{ type: 'ITEM' as const, id: item.id }],
        tile: item.tile
      };
    }),
    ...(visible.textBoxes ?? []).filter(open).map((textBox) => {
      return {
        key: `TEXTBOX:${textBox.id}`,
        refs: [{ type: 'TEXTBOX' as const, id: textBox.id }],
        tile: textBox.tile
      };
    }),
    ...(visible.rectangles ?? []).filter(open).map((rectangle) => {
      return {
        key: `RECTANGLE:${rectangle.id}`,
        refs: [{ type: 'RECTANGLE' as const, id: rectangle.id }],
        tile: {
          x: Math.round((rectangle.from.x + rectangle.to.x) / 2),
          y: Math.round((rectangle.from.y + rectangle.to.y) / 2)
        }
      };
    }),
    ...collapsedBoxes(visible)
      .map((box) => {
        return {
          key: `GROUP:${box.groupId}`,
          refs: collapsedGroupMembers(full, box.groupId),
          tile: box.tile,
          groupId: box.groupId
        };
      })
      .filter((stop) => {
        return stop.refs.length > 0;
      })
  ].sort(byReadingOrder);

  const connectors: KeyboardStop[] = [];
  (visible.connectors ?? []).forEach((connector) => {
    const tile = connectorTile(visible, connector);
    if (!open(connector) || !tile) return;
    connectors.push({
      key: `CONNECTOR:${connector.id}`,
      refs: [{ type: 'CONNECTOR', id: connector.id }],
      tile
    });
  });

  return [...shapes, ...connectors.sort(byReadingOrder)];
};

/** The stop `selection` is exactly, or -1. */
export const stopIndex = (
  stops: KeyboardStop[],
  selection: ItemReference[]
): number => {
  if (selection.length === 0) return -1;
  const selected = new Set(
    selection.map((ref) => {
      return `${ref.type}:${ref.id}`;
    })
  );
  return stops.findIndex((stop) => {
    return (
      stop.refs.length === selected.size &&
      stop.refs.every((ref) => {
        return selected.has(`${ref.type}:${ref.id}`);
      })
    );
  });
};

/** Rich-text HTML as plain words. */
export const plainText = (html: string | undefined, max = 200) => {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Last, so an escaped entity (&amp;lt;) stays the literal text &lt;.
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

export interface DescribeContext {
  view: View;
  modelItems: ModelItem[];
  icons: Icon[];
}

const nodeName = (ctx: DescribeContext, id: string | undefined) => {
  if (!id) return undefined;
  return (
    ctx.modelItems.find((m) => {
      return m.id === id;
    })?.name ?? 'an unnamed item'
  );
};

/** The names of the nodes a node is connected to, on this view. */
export const connectedNames = (ctx: DescribeContext, nodeId: string) => {
  const names: string[] = [];
  for (const connector of ctx.view.connectors ?? []) {
    const ends = connector.anchors
      .map((anchor) => {
        return anchor.ref.item;
      })
      .filter((id): id is string => {
        return id !== undefined;
      });
    if (!ends.includes(nodeId)) continue;
    for (const end of ends) {
      if (end === nodeId) continue;
      const name = nodeName(ctx, end);
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
};

/** A connector's two named ends, as "A to B", when it has them. */
const connectorEnds = (ctx: DescribeContext, connectorId: string) => {
  const connector = (ctx.view.connectors ?? []).find((c) => {
    return c.id === connectorId;
  });
  if (!connector) return { connector, text: '' };
  const ends = connector.anchors
    .map((anchor) => {
      return anchor.ref.item;
    })
    .filter((id): id is string => {
      return id !== undefined;
    });
  const from = nodeName(ctx, ends[0]);
  const to = nodeName(ctx, ends[ends.length - 1]);
  const text =
    from && to && ends.length > 1
      ? `from ${from} to ${to}`
      : from
        ? `from ${from}`
        : '';
  return { connector, text };
};

/** What one object is, in words: its kind, name, description, links. */
export const describeRef = (ctx: DescribeContext, ref: ItemReference) => {
  switch (ref.type) {
    case 'ITEM': {
      const model = ctx.modelItems.find((m) => {
        return m.id === ref.id;
      });
      const iconName = ctx.icons.find((icon) => {
        return icon.id === model?.icon;
      })?.name;
      const parts = [
        iconName && iconName !== model?.name
          ? `${model?.name ?? 'Unnamed item'}, ${iconName}`
          : (model?.name ?? 'Unnamed item')
      ];
      const description = plainText(model?.description);
      if (description) parts.push(description);
      const linked = connectedNames(ctx, ref.id);
      if (linked.length > 0) parts.push(`Connected to ${linked.join(', ')}`);
      return parts.join('. ');
    }
    case 'CONNECTOR': {
      const { connector, text } = connectorEnds(ctx, ref.id);
      const label = plainText(connector?.description);
      return [`Connector${text ? ` ${text}` : ''}`, label]
        .filter(Boolean)
        .join('. ');
    }
    case 'TEXTBOX': {
      const textBox = (ctx.view.textBoxes ?? []).find((t) => {
        return t.id === ref.id;
      });
      return `Text: ${plainText(textBox?.content) || 'empty'}`;
    }
    case 'RECTANGLE':
      return 'Rectangle';
    default:
      return 'Connector end';
  }
};

/** What a Tab stop is, in words, with where it is in the order. */
export const describeStop = (
  ctx: DescribeContext,
  stops: KeyboardStop[],
  index: number
) => {
  const stop = stops[index];
  const position = `${index + 1} of ${stops.length}`;
  if (stop.groupId) {
    const group = (ctx.view.groups ?? []).find((g) => {
      return g.id === stop.groupId;
    });
    return `Collapsed group${group?.name ? ` ${group.name}` : ''}, ${stop.refs.length} objects. ${position}`;
  }
  return `${describeRef(ctx, stop.refs[0])}. ${position}`;
};

/** The words for a selection, however it was made. */
export const describeSelection = (
  ctx: DescribeContext,
  stops: KeyboardStop[],
  selection: ItemReference[]
) => {
  if (selection.length === 0) return 'Nothing selected';
  const index = stopIndex(stops, selection);
  if (index !== -1) return describeStop(ctx, stops, index);
  if (selection.length === 1) return describeRef(ctx, selection[0]);
  return `${selection.length} objects selected`;
};

/**
 * The free tile nearest `tile` that no node stands on. It prefers a tile
 * with no node on any of the eight around it either: a node's label rises
 * above its tile, so one placed on a neighbouring tile sat on top of the
 * other's label. With no such tile, any free tile.
 */
export const freeTileNear = (view: View, tile: Coords): Coords => {
  const taken = new Set(
    view.items.map((item) => {
      return `${item.tile.x},${item.tile.y}`;
    })
  );
  const isFree = (at: Coords) => {
    return !taken.has(`${at.x},${at.y}`);
  };
  const isClear = (at: Coords) => {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (!isFree({ x: at.x + dx, y: at.y + dy })) return false;
      }
    }
    return true;
  };
  for (const accept of [isClear, isFree]) {
    for (let ring = 0; ring < 64; ring += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dy = -ring; dy <= ring; dy += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const candidate = { x: tile.x + dx, y: tile.y + dy };
          if (accept(candidate)) return candidate;
        }
      }
    }
  }
  return tile;
};
