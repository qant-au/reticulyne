// What the viewer draws for one view, worked out the way the editor does
// it (src/hooks/useScene.ts, sceneLists.ts and the SceneLayers), from the
// same React-free utils, so the two cannot drift apart: hidden layers and
// the redacted layer left out, collapsed groups folded into their boxes,
// connectors routed by the editor's router, floor stubs, and the fit.

import {
  CONNECTOR_DEFAULTS,
  DEFAULT_COLOR,
  DEFAULT_LABEL_HEIGHT,
  RECTANGLE_DEFAULTS,
  TEXTBOX_DEFAULTS,
  isEmptyMarkdown
} from 'src/config';
import { getItemByIdOrThrow } from 'src/utils/basics';
import { CoordsUtils } from 'src/utils/CoordsUtils';
import {
  clipPathAtCollapsedBoxes,
  collapsedBoxes,
  COLLAPSED_BOX_REACH,
  filterViewByCollapsedGroups,
  isInCollapsedGroup,
  reroutedPath,
  type CollapsedBox
} from 'src/utils/collapse';
import { groupAndDescendants, groupBounds, groupChain } from 'src/utils/groups';
import {
  connectorPathTileToGlobal,
  flipConnectorTileY,
  getConnectorDirectionIcon,
  getConnectorPath
} from 'src/utils/connector';
import { getTilePosition } from 'src/utils/coordinates';
import { sortByPosition } from 'src/utils/geometry';
import { floorStubs, type FloorStub } from 'src/utils/floors';
import {
  filterViewByLayers,
  hiddenLayerIds,
  REDACTED_LAYER_ID
} from 'src/utils/layers';
import { getFitToViewParams } from 'src/utils/fitToView';
import { getTextBoxDimensions } from 'src/utils/textBox';
import type {
  ConnectorGlyph,
  ConnectorPath,
  Coords,
  Icon,
  LabelPosition,
  Model,
  Projection,
  ProjectionOrientationEnum,
  Size,
  View
} from 'src/types';
import type { IconOverride } from 'src/core';
import { getColorVariant, withAlpha } from './color';

export const UNPROJECTED = 100;

// As Groups.tsx: the room round a group's members, and a collapsed box's
// reach from its tile's centre less the half tile.
const GROUP_PAD = 0.4;
const BOX = COLLAPSED_BOX_REACH - 0.5;

export interface TileArea {
  from: Coords;
  to: Coords;
}

export interface PreparedGroup extends TileArea {
  id: string;
  name?: string;
  /** Null when the group has no colour: the theme's hover tint is used. */
  fill: string | null;
  /** Where its name goes: under the corner lowest on screen. */
  namePosition: Coords;
}

export interface PreparedBox {
  groupId: string;
  area: TileArea;
  fill: string | null;
  label: string;
  labelPosition: Coords;
}

export interface PreparedRectangle extends TileArea {
  id: string;
  fill: string;
  stroke: string;
}

export interface PreparedConnector {
  id: string;
  area: TileArea;
  /** SVG points, in the connector's own unprojected px. */
  points: string;
  width: number;
  stroke: string;
  dash: string | null;
  glyph: ConnectorGlyph;
  glyphs: { x: number; y: number; rotation: number }[];
  description: string;
  labelPosition: Coords;
}

export interface PreparedTextBox {
  id: string;
  from: Coords;
  to: Coords;
  orientation: keyof typeof ProjectionOrientationEnum;
  content: string;
  fontSize: number;
}

export type NodeImage =
  | { kind: 'iso'; url: string }
  | { kind: 'non-iso'; url: string }
  | { kind: 'flat'; url: string };

export interface PreparedNode {
  id: string;
  position: Coords;
  order: number;
  name: string;
  description: string | null;
  image: NodeImage | null;
  labelHeight: number;
  labelPosition: LabelPosition;
}

export interface PreparedStub extends FloorStub {
  position: Coords;
  floorName: string;
  itemName: string;
}

export interface PreparedView {
  id: string;
  name: string;
  projection: Projection;
  groups: PreparedGroup[];
  boxes: PreparedBox[];
  rectangles: PreparedRectangle[];
  connectors: PreparedConnector[];
  textBoxes: PreparedTextBox[];
  nodes: PreparedNode[];
  stubs: PreparedStub[];
  /** The zoom and scroll that fit the view in a viewport this size. */
  fit: (size: Size) => { zoom: number; scroll: Coords };
}

const colorOf = (model: Model, id?: string) => {
  const colors = model.colors;
  const found =
    id === undefined
      ? undefined
      : colors.find((c) => {
          return c.id === id;
        });
  return (found ?? colors[0] ?? DEFAULT_COLOR).value;
};

/** The icon drawn for a node, as useIcon picks it. */
const nodeImage = (
  icon: Icon | undefined,
  projection: Projection,
  override?: IconOverride
): NodeImage | null => {
  if (projection === 'schematic' && override?.flatUrl) {
    return { kind: 'flat', url: override.flatUrl };
  }
  if (projection === 'iso' && override?.url) {
    return { kind: 'iso', url: override.url };
  }
  if (!icon) return null;
  const url =
    projection === 'schematic' ? (icon.flatUrl ?? icon.url) : icon.url;
  if (!url) return null;
  if (projection === 'schematic') return { kind: 'flat', url };
  if (!icon.isIsometric) return { kind: 'non-iso', url };
  return { kind: 'iso', url };
};

const dashFor = (style: string, width: number) => {
  switch (style) {
    case 'DASHED':
      return `${width * 2}, ${width * 2}`;
    case 'DOTTED':
      return `0, ${width * 1.8}`;
    default:
      return null;
  }
};

/** The view ids and names, in floor order. */
export const listViews = (model: Model) => {
  return model.views.map((view) => {
    return { id: view.id, name: view.name, kind: view.kind ?? 'iso' };
  });
};

/**
 * The drawing for one view of `model`, in `projection` (the view's own
 * kind when left out).
 */
export const prepareView = (
  model: Model,
  viewId: string,
  projection?: Projection
): PreparedView => {
  const original = getItemByIdOrThrow(model.views, viewId).value;
  const kind: Projection = projection ?? original.kind ?? 'iso';

  // Connectors the editor would drop on load (their ends are gone) are
  // dropped here too: the router throws on an end it cannot find.
  const paths = new Map<string, ConnectorPath>();
  for (const connector of original.connectors ?? []) {
    try {
      paths.set(
        connector.id,
        getConnectorPath({ anchors: connector.anchors, view: original })
      );
    } catch {
      // left out, as syncConnector does
    }
  }
  const full: View = {
    ...original,
    kind,
    connectors: (original.connectors ?? []).filter((c) => {
      return paths.has(c.id);
    })
  };
  const leftOut = hiddenLayerIds(model.layers);
  leftOut.add(REDACTED_LAYER_ID);
  const visible = filterViewByCollapsedGroups(
    filterViewByLayers(full, leftOut)
  );
  const boxes: CollapsedBox[] = collapsedBoxes(visible);

  const groups = (visible.groups ?? [])
    .map((group) => {
      if (isInCollapsedGroup(full, group.id)) return null;
      const inside = groupAndDescendants(full, group.id);
      const boxTiles = boxes
        .filter((b) => {
          return inside.has(b.groupId);
        })
        .map((b) => {
          return b.tile;
        });
      const shown = groupBounds(visible, group.id);
      const tiles = [...(shown ? [shown.from, shown.to] : []), ...boxTiles];
      if (tiles.length === 0) return null;
      const { lowX, lowY, highX, highY } = sortByPosition(tiles);
      const from = { x: lowX - GROUP_PAD, y: lowY - GROUP_PAD };
      const to = { x: highX + GROUP_PAD, y: highY + GROUP_PAD };
      const corners: Coords[] = [
        from,
        { x: to.x, y: from.y },
        to,
        { x: from.x, y: to.y }
      ];
      const namePosition = corners
        .map((tile) => {
          return getTilePosition({ tile, origin: 'BOTTOM', projection: kind });
        })
        .sort((a, b) => {
          return b.y - a.y;
        })[0];
      return {
        prepared: {
          id: group.id,
          name: group.name,
          from,
          to,
          fill: group.color ? withAlpha(group.color, 0.25) : null,
          namePosition
        },
        depth: groupChain(visible, group.id).length
      };
    })
    .filter((g): g is NonNullable<typeof g> => {
      return g !== null;
    })
    .sort((a, b) => {
      return a.depth - b.depth;
    })
    .map((g) => {
      return g.prepared;
    });

  const preparedBoxes: PreparedBox[] = boxes.flatMap((box) => {
    const group = full.groups?.find((g) => {
      return g.id === box.groupId;
    });
    if (!group) return [];
    return [
      {
        groupId: group.id,
        area: {
          from: { x: box.tile.x - BOX, y: box.tile.y - BOX },
          to: { x: box.tile.x + BOX, y: box.tile.y + BOX }
        },
        fill: group.color ? withAlpha(group.color, 0.6) : null,
        label: `${group.name ?? 'Group'} (${box.count})`,
        labelPosition: getTilePosition({
          tile: box.tile,
          origin: 'CENTER',
          projection: kind
        })
      }
    ];
  });

  const rectangles: PreparedRectangle[] = [...(visible.rectangles ?? [])]
    .map((r) => {
      return { ...RECTANGLE_DEFAULTS, ...r };
    })
    .sort((a, b) => {
      return (a.zIndex ?? 0) - (b.zIndex ?? 0);
    })
    .reverse()
    .map((r) => {
      const hex = r.colorValue ?? colorOf(model, r.color);
      const fill =
        r.transparency !== undefined && r.transparency > 0
          ? withAlpha(hex, 1 - r.transparency)
          : hex;
      return {
        id: r.id,
        from: r.from,
        to: r.to,
        fill,
        stroke: r.outlineColor ?? getColorVariant(hex, 'dark', { grade: 2 })
      };
    });

  const connectors: PreparedConnector[] = (visible.connectors ?? []).flatMap(
    (c) => {
      const merged = { ...CONNECTOR_DEFAULTS, ...c };
      const path = reroutedPath(visible, c.id) ?? paths.get(c.id);
      if (!path) return [];
      const origin = path.rectangle.from;
      const gridHeight =
        Math.abs(path.rectangle.from.y - path.rectangle.to.y) + 1;
      const tiles = clipPathAtCollapsedBoxes(
        path.tiles.map((tile) => {
          return connectorPathTileToGlobal(tile, origin);
        }),
        boxes
      ).map((tile) => {
        return {
          x: tile.x - origin.x,
          y: flipConnectorTileY(tile.y - origin.y, gridHeight)
        };
      });
      const width = (UNPROJECTED / 100) * merged.width;
      const points = tiles.reduce((acc, tile) => {
        return `${acc} ${tile.x * UNPROJECTED + UNPROJECTED / 2},${
          tile.y * UNPROJECTED + UNPROJECTED / 2
        }`;
      }, '');
      const middle = path.tiles[Math.floor(path.tiles.length / 2)];
      return [
        {
          id: c.id,
          area: { from: path.rectangle.from, to: path.rectangle.to },
          points,
          width,
          stroke: getColorVariant(colorOf(model, c.color), 'dark', {
            grade: 1
          }),
          dash: dashFor(merged.style, width),
          glyph: merged.glyph,
          glyphs: getConnectorDirectionIcon(tiles, merged.direction),
          description: merged.description ?? '',
          labelPosition: middle
            ? getTilePosition({
                tile: connectorPathTileToGlobal(middle, origin),
                projection: kind
              })
            : { x: 0, y: 0 }
        }
      ];
    }
  );

  const textBoxes: PreparedTextBox[] = (visible.textBoxes ?? []).map((t) => {
    const merged = { ...TEXTBOX_DEFAULTS, ...t };
    const size = getTextBoxDimensions(merged);
    return {
      id: t.id,
      from: t.tile,
      to: CoordsUtils.add(t.tile, { x: size.width, y: 0 }),
      orientation: merged.orientation,
      content: merged.content,
      fontSize: merged.fontSize
    };
  });

  const nodes: PreparedNode[] = [...(visible.items ?? [])]
    .reverse()
    .flatMap((placed) => {
      const item = model.items.find((i) => {
        return i.id === placed.id;
      });
      if (!item) return [];
      const icon = item.icon
        ? model.icons.find((i) => {
            return i.id === item.icon;
          })
        : undefined;
      return [
        {
          id: item.id,
          position: getTilePosition({
            tile: placed.tile,
            origin: kind === 'schematic' ? 'CENTER' : 'BOTTOM',
            projection: kind
          }),
          order: -placed.tile.x - placed.tile.y,
          name: item.name ?? '',
          description: isEmptyMarkdown(item.description)
            ? null
            : (item.description ?? null),
          image: nodeImage(icon, kind, item.iconOverride),
          labelHeight: placed.labelHeight ?? DEFAULT_LABEL_HEIGHT,
          labelPosition: placed.labelPosition ?? 'N'
        }
      ];
    });

  const viewNames = new Map(
    model.views.map((v) => {
      return [v.id, v.name];
    })
  );
  const itemNames = new Map(
    model.items.map((i) => {
      return [i.id, i.name];
    })
  );
  const stubs: PreparedStub[] = floorStubs(
    model.views,
    viewId,
    model.connections,
    leftOut
  ).map((stub) => {
    return {
      ...stub,
      position: getTilePosition({ tile: stub.tile, projection: kind }),
      floorName: viewNames.get(stub.remoteViewId) ?? '',
      itemName: itemNames.get(stub.remoteItemId) ?? ''
    };
  });

  return {
    id: original.id,
    name: original.name,
    projection: kind,
    groups,
    boxes: preparedBoxes,
    rectangles,
    connectors,
    textBoxes,
    nodes,
    stubs,
    // The editor fits the whole view, hidden layers included.
    fit: (size) => {
      return getFitToViewParams(full, size);
    }
  };
};
