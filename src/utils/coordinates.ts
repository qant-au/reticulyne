// Screen ↔ tile coordinate conversion + mouse tracking.
//
// Everything that translates between (screen px) and (iso tile) lives
// here, plus the per-frame mouse-state update that the interaction
// manager calls on every mousemove/mousedown.
//
// Extracted from src/utils/renderer.ts under QUA4-07.

import {
  Coords,
  TileOrigin,
  Size,
  Scroll,
  Mouse,
  SlimMouseEvent,
  Projection
} from 'src/types';
import { CoordsUtils } from './CoordsUtils';
import { SizeUtils } from './SizeUtils';
import { getProjectedTileSize } from './projection';

interface ScreenToIso {
  mouse: Coords;
  zoom: number;
  scroll: Scroll;
  rendererSize: Size;
  projection?: Projection;
}

// The pointer's position in tile units before flooring: tile x spans
// [x, x+1) of fx, and tile y spans (y-1, y] of fy.
const fractionalTile = ({
  mouse,
  zoom,
  scroll,
  rendererSize,
  projection
}: ScreenToIso) => {
  const projectedTileSize = SizeUtils.multiply(
    getProjectedTileSize(projection),
    zoom
  );
  const px = -rendererSize.width * 0.5 + mouse.x - scroll.position.x;
  const py = -rendererSize.height * 0.5 + mouse.y - scroll.position.y;

  if (projection === 'schematic') {
    return {
      fx: (px + projectedTileSize.width / 2) / projectedTileSize.width,
      fy: -(py + projectedTileSize.height / 2) / projectedTileSize.height
    };
  }

  return {
    fx:
      (px + projectedTileSize.width / 2) / projectedTileSize.width -
      py / projectedTileSize.height,
    fy: -(
      (py + projectedTileSize.height / 2) / projectedTileSize.height +
      px / projectedTileSize.width
    )
  };
};

/**
 * The pointer's position in tile units, not rounded to a tile: a tile's
 * centre is at its whole coordinates, as getTilePosition draws it. For
 * hit-testing something drawn across part of a tile, or more than one.
 */
export const pointerTilePosition = (args: ScreenToIso): Coords => {
  const { fx, fy } = fractionalTile(args);
  return { x: fx - 0.5, y: fy + 0.5 };
};

// converts a mouse position to a tile position
export const screenToIso = (args: ScreenToIso) => {
  const { fx, fy } = fractionalTile(args);

  return {
    x: Math.floor(fx),
    y: -Math.floor(-fy)
  };
};

// The point under the pointer in tile units, unrounded: a whole number at
// a tile's centre. getTilePosition is linear, so feeding it this keeps a
// point exactly where it was, which rounding to the tile (screenToIso)
// does not: the view toggle moved everything by up to half a tile.
export const screenToTilePoint = (args: ScreenToIso): Coords => {
  const { fx, fy } = fractionalTile(args);
  return { x: fx - 0.5, y: fy + 0.5 };
};

// The tile a dragged rectangle corner should snap to. A corner handle is
// drawn on the tile's outer vertex, which is exactly a tile boundary, so
// flooring the pointer's position (screenToIso) moved the corner a whole
// tile on a 2px nudge. This snaps to the tile whose outer vertex is
// nearest the pointer instead. `highX`/`highY` say which side of the
// rectangle the corner is on.
export const cornerTileAtPointer = (
  args: ScreenToIso,
  highX: boolean,
  highY: boolean
): Coords => {
  const { fx, fy } = fractionalTile(args);
  return {
    x: highX ? Math.round(fx) - 1 : Math.round(fx),
    y: highY ? Math.round(fy) : Math.round(fy) + 1
  };
};

interface GetTilePosition {
  tile: Coords;
  origin?: TileOrigin;
  projection?: Projection;
}

// Where each named vertex of a tile sits, from its centre, in the flat
// view. The names are the iso vertices' (LEFT is the corner at the lowest
// x and y), so a caller that anchors to one lands on the same corner of
// the tile in both views.
const schematicOrigins: Record<TileOrigin, Coords> = {
  CENTER: { x: 0, y: 0 },
  LEFT: { x: -0.5, y: -0.5 },
  RIGHT: { x: 0.5, y: 0.5 },
  TOP: { x: 0.5, y: -0.5 },
  BOTTOM: { x: -0.5, y: 0.5 }
};

export const getTilePosition = ({
  tile,
  origin = 'CENTER',
  projection = 'iso'
}: GetTilePosition) => {
  if (projection === 'schematic') {
    const size = getProjectedTileSize(projection);
    const offset = schematicOrigins[origin] ?? schematicOrigins.CENTER;
    return {
      x: (tile.x + offset.x) * size.width,
      y: (-tile.y + offset.y) * size.height
    };
  }

  const tileSize = getProjectedTileSize(projection);
  const halfW = tileSize.width / 2;
  const halfH = tileSize.height / 2;

  const position: Coords = {
    x: halfW * tile.x - halfW * tile.y,
    y: -(halfH * tile.x + halfH * tile.y)
  };

  switch (origin) {
    case 'TOP':
      return CoordsUtils.add(position, { x: 0, y: -halfH });
    case 'BOTTOM':
      return CoordsUtils.add(position, { x: 0, y: halfH });
    case 'LEFT':
      return CoordsUtils.add(position, { x: -halfW, y: 0 });
    case 'RIGHT':
      return CoordsUtils.add(position, { x: halfW, y: 0 });
    case 'CENTER':
    default:
      return position;
  }
};

type IsoToScreen = GetTilePosition & {
  rendererSize: Size;
};

export const isoToScreen = ({
  tile,
  origin,
  rendererSize,
  projection
}: IsoToScreen) => {
  const position = getTilePosition({ tile, origin, projection });

  return {
    x: position.x + rendererSize.width / 2,
    y: position.y + rendererSize.height / 2
  };
};

// The scroll that keeps the point at the centre of the canvas where
// it is when the view switches from one projection to the other.
export const scrollKeepingCentre = ({
  zoom,
  scroll,
  rendererSize,
  from,
  to
}: {
  zoom: number;
  scroll: Scroll;
  rendererSize: Size;
  from: Projection;
  to: Projection;
}): Coords => {
  const centre = screenToTilePoint({
    mouse: { x: rendererSize.width / 2, y: rendererSize.height / 2 },
    zoom,
    scroll,
    rendererSize,
    projection: from
  });
  const p = getTilePosition({ tile: centre, projection: to });
  return { x: -p.x * zoom, y: -p.y * zoom };
};

interface GetMouse {
  interactiveElement: HTMLElement;
  zoom: number;
  scroll: Scroll;
  lastMouse: Mouse;
  mouseEvent: SlimMouseEvent;
  rendererSize: Size;
  projection?: Projection;
}

export const getMouse = ({
  interactiveElement,
  zoom,
  scroll,
  lastMouse,
  mouseEvent,
  rendererSize,
  projection
}: GetMouse): Mouse => {
  const componentOffset = interactiveElement.getBoundingClientRect();
  const offset: Coords = {
    x: componentOffset?.left ?? 0,
    y: componentOffset?.top ?? 0
  };

  const { clientX, clientY } = mouseEvent;

  const mousePosition = {
    x: clientX - offset.x,
    y: clientY - offset.y
  };

  const newPosition: Mouse['position'] = {
    screen: mousePosition,
    tile: screenToIso({
      mouse: mousePosition,
      zoom,
      scroll,
      rendererSize,
      projection
    })
  };

  const newDelta: Mouse['delta'] = {
    screen: CoordsUtils.subtract(newPosition.screen, lastMouse.position.screen),
    tile: CoordsUtils.subtract(newPosition.tile, lastMouse.position.tile)
  };

  // Both the Pointer Events names and the legacy Mouse Events names are
  // accepted. FEA10-01 migrated the interaction manager to Pointer Events
  // but left this switch matching only `mousedown` / `mousemove`, so every
  // real event fell through to `default` and `mouse.mousedown` was pinned
  // at null — which silently disabled every drag path that guards on it
  // (DragItems, Pan, DrawRectangle, and now Marquee).
  const getMousedown = (): Mouse['mousedown'] => {
    switch (mouseEvent.type) {
      case 'pointerdown':
      case 'mousedown':
        return newPosition;
      case 'pointermove':
      case 'mousemove':
        return lastMouse.mousedown;
      default:
        return null;
    }
  };

  const nextMouse: Mouse = {
    position: newPosition,
    delta: newDelta,
    mousedown: getMousedown()
  };

  return nextMouse;
};

export const getTileScrollPosition = (
  tile: Coords,
  origin?: TileOrigin,
  projection?: Projection
): Coords => {
  const tilePosition = getTilePosition({ tile, origin, projection });

  return {
    x: -tilePosition.x,
    y: -tilePosition.y
  };
};
