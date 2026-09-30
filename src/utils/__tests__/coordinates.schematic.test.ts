import {
  cornerTileAtPointer,
  getTilePosition,
  isoToScreen,
  screenToIso
} from '../coordinates';
import { getIsoMatrix, getProjectedTileSize } from '../projection';
import { SCHEMATIC_TILE_SIZE } from 'src/config';

// lw-050: the flat, schematic view draws the same tile grid as the
// isometric one, without the projection.
const S = SCHEMATIC_TILE_SIZE.width;
// screenToIso negates a floor, as the iso view always has, so row 0 can
// come back as -0.
const tileAt = (args: Parameters<typeof screenToIso>[0]) => {
  const t = screenToIso(args);
  return { x: t.x + 0, y: t.y + 0 };
};
const view = {
  zoom: 1,
  scroll: { position: { x: 0, y: 0 }, offset: { x: 0, y: 0 } },
  rendererSize: { width: 800, height: 600 },
  projection: 'schematic' as const
};

describe('schematic projection', () => {
  test('a tile is a square: +x draws right, +y draws up', () => {
    expect(getProjectedTileSize('schematic')).toEqual({
      width: S,
      height: S
    });
    expect(
      getTilePosition({ tile: { x: 2, y: 3 }, projection: 'schematic' })
    ).toEqual({ x: 2 * S, y: -3 * S });
  });

  test('named vertices are the same corners of the tile as in iso', () => {
    const at = (origin: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM') => {
      return getTilePosition({
        tile: { x: 0, y: 0 },
        origin,
        projection: 'schematic'
      });
    };
    // LEFT is the corner at the lowest x and y, RIGHT the highest.
    expect(at('LEFT')).toEqual({ x: -S / 2, y: -S / 2 });
    expect(at('RIGHT')).toEqual({ x: S / 2, y: S / 2 });
    expect(at('TOP')).toEqual({ x: S / 2, y: -S / 2 });
    expect(at('BOTTOM')).toEqual({ x: -S / 2, y: S / 2 });
  });

  test('screenToIso inverts isoToScreen for every tile near the origin', () => {
    for (let x = -4; x <= 4; x += 1) {
      for (let y = -4; y <= 4; y += 1) {
        const screen = isoToScreen({
          tile: { x, y },
          rendererSize: view.rendererSize,
          projection: 'schematic'
        });
        expect(tileAt({ ...view, mouse: screen })).toEqual({ x, y });
        // Anywhere inside the tile, not only its centre.
        expect(
          tileAt({
            ...view,
            mouse: { x: screen.x + S * 0.45, y: screen.y - S * 0.45 }
          })
        ).toEqual({ x, y });
      }
    }
  });

  test('zoom and scroll are honoured', () => {
    const zoomed = {
      ...view,
      zoom: 2,
      scroll: { position: { x: 50, y: -30 }, offset: { x: 0, y: 0 } }
    };
    const p = getTilePosition({
      tile: { x: 3, y: -1 },
      projection: 'schematic'
    });
    const mouse = {
      x: 400 + 50 + p.x * 2,
      y: 300 - 30 + p.y * 2
    };
    expect(tileAt({ ...zoomed, mouse })).toEqual({ x: 3, y: -1 });
  });

  test('a rectangle corner snaps to the nearest tile corner', () => {
    // The top-right vertex of tile (0, 0) is its TOP vertex.
    const top = isoToScreen({
      tile: { x: 0, y: 0 },
      origin: 'TOP',
      rendererSize: view.rendererSize,
      projection: 'schematic'
    });
    const mouse = { x: top.x + 2, y: top.y - 2 };
    expect(cornerTileAtPointer({ ...view, mouse }, true, true)).toEqual({
      x: 0,
      y: 0
    });
  });

  test('the iso view is unchanged when no projection is given', () => {
    expect(getIsoMatrix()).toEqual(getIsoMatrix(undefined, 'iso'));
    expect(getTilePosition({ tile: { x: 1, y: 0 } })).toEqual(
      getTilePosition({ tile: { x: 1, y: 0 }, projection: 'iso' })
    );
    expect(getIsoMatrix('X', 'schematic')).toEqual([1, 0, 0, 1, 0, 0]);
  });
});
