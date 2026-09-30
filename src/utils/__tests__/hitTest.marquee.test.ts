import { getItemsInBounds, getItemsInScreenRect } from '../hitTest';
import { getTilePosition, screenToIso } from '../coordinates';
import { doBoundsIntersect, getBoundingBox } from '../geometry';
import type { useScene } from 'src/hooks/useScene';

type SceneShape = ReturnType<typeof useScene>;

const box = (x1: number, y1: number, x2: number, y2: number) => {
  return getBoundingBox([
    { x: x1, y: y1 },
    { x: x2, y: y2 }
  ]);
};

describe('doBoundsIntersect', () => {
  test('overlapping boxes intersect', () => {
    expect(doBoundsIntersect(box(0, 0, 5, 5), box(3, 3, 8, 8))).toBe(true);
  });

  test('disjoint boxes do not', () => {
    expect(doBoundsIntersect(box(0, 0, 2, 2), box(5, 5, 7, 7))).toBe(false);
  });

  test('a box fully containing another intersects', () => {
    expect(doBoundsIntersect(box(0, 0, 10, 10), box(4, 4, 5, 5))).toBe(true);
  });

  test('boxes sharing only an edge tile intersect — tiles are unit cells', () => {
    expect(doBoundsIntersect(box(0, 0, 2, 2), box(2, 2, 4, 4))).toBe(true);
  });

  test('adjacent but non-touching boxes do not', () => {
    expect(doBoundsIntersect(box(0, 0, 2, 2), box(3, 0, 5, 2))).toBe(false);
  });

  test('corner order does not matter', () => {
    expect(doBoundsIntersect(box(5, 5, 0, 0), box(8, 8, 3, 3))).toBe(true);
  });
});

const makeScene = (overrides: Partial<SceneShape> = {}): SceneShape => {
  return {
    items: [],
    textBoxes: [],
    connectors: [],
    rectangles: [],
    ...overrides
  } as unknown as SceneShape;
};

describe('getItemsInBounds', () => {
  test('returns items whose tile falls inside the band', () => {
    const scene = makeScene({
      items: [
        { id: 'in', tile: { x: 2, y: 2 } },
        { id: 'out', tile: { x: 9, y: 9 } }
      ]
    } as unknown as Partial<SceneShape>);

    const found = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 5, y: 5 },
      scene
    });

    expect(found).toEqual([{ type: 'ITEM', id: 'in' }]);
  });

  // Containment, as Excalidraw (the parity target): sweep 2026-09-30 found a
  // band around one node also took the connector running off to another.
  test('a rectangle the band merely crosses is not caught; one wholly inside is', () => {
    const scene = makeScene({
      rectangles: [
        { id: 'big', from: { x: -10, y: 2 }, to: { x: 10, y: 3 } },
        { id: 'small', from: { x: 1, y: 1 }, to: { x: 3, y: 2 } }
      ]
    } as unknown as Partial<SceneShape>);

    const found = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 5, y: 5 },
      scene
    });

    expect(found).toEqual([{ type: 'RECTANGLE', id: 'small' }]);
  });

  test('a connector is caught only when its whole route is inside', () => {
    const scene = makeScene({
      connectors: [
        {
          id: 'inside',
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 5, y: 5 } },
            tiles: [
              { x: 1, y: 1 },
              { x: 2, y: 1 },
              { x: 3, y: 1 }
            ]
          }
        }
      ]
    } as unknown as Partial<SceneShape>);

    expect(
      getItemsInBounds({ from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, scene })
    ).toEqual([{ type: 'CONNECTOR', id: 'inside' }]);
  });

  test('a connector with one end outside the band is not caught', () => {
    const scene = makeScene({
      connectors: [
        {
          id: 'con',
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 20, y: 20 } },
            tiles: [
              { x: 15, y: 15 },
              { x: 3, y: 3 }
            ]
          }
        }
      ]
    } as unknown as Partial<SceneShape>);

    expect(
      getItemsInBounds({ from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, scene })
    ).toEqual([]);
  });

  test('a connector wholly outside the band is not caught', () => {
    const scene = makeScene({
      connectors: [
        {
          id: 'con',
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 20, y: 20 } },
            tiles: [{ x: 15, y: 15 }]
          }
        }
      ]
    } as unknown as Partial<SceneShape>);

    expect(
      getItemsInBounds({ from: { x: 0, y: 0 }, to: { x: 5, y: 5 }, scene })
    ).toEqual([]);
  });

  test('dragging the band from any corner yields the same set', () => {
    const scene = makeScene({
      items: [
        { id: 'a', tile: { x: 1, y: 1 } },
        { id: 'b', tile: { x: 4, y: 4 } }
      ]
    } as unknown as Partial<SceneShape>);

    const forwards = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 5, y: 5 },
      scene
    });
    const backwards = getItemsInBounds({
      from: { x: 5, y: 5 },
      to: { x: 0, y: 0 },
      scene
    });

    expect(backwards).toEqual(forwards);
    expect(forwards).toHaveLength(2);
  });

  test('an empty band catches nothing', () => {
    expect(
      getItemsInBounds({
        from: { x: 0, y: 0 },
        to: { x: 5, y: 5 },
        scene: makeScene()
      })
    ).toEqual([]);
  });

  test('never returns CONNECTOR_ANCHOR references', () => {
    const scene = makeScene({
      items: [{ id: 'a', tile: { x: 1, y: 1 } }],
      connectors: [
        {
          id: 'con',
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 5, y: 5 } },
            tiles: [{ x: 2, y: 2 }]
          }
        }
      ]
    } as unknown as Partial<SceneShape>);

    const found = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 5, y: 5 },
      scene
    });

    expect(
      found.some((f) => {
        return f.type === 'CONNECTOR_ANCHOR';
      })
    ).toBe(false);
  });
});

// Sweep 2026-09-30: the band was the box of tiles between the drag's two
// corner tiles. In the isometric view that is a thin diamond, so a node
// plainly inside the rectangle the pointer drew (Firewall, off the band's
// diagonal) was never caught. The band is now the screen rectangle.
describe('getItemsInScreenRect', () => {
  const canvas = { width: 1000, height: 800 };
  const noScroll = { position: { x: 0, y: 0 }, offset: { x: 0, y: 0 } };
  // Where a tile's centre is drawn on this canvas, at zoom 1.
  const at = (x: number, y: number) => {
    const p = getTilePosition({ tile: { x, y } });
    return { x: canvas.width / 2 + p.x, y: canvas.height / 2 + p.y };
  };
  const scene = makeScene({
    items: [
      // Up and to the right of the drag's start, well inside the rectangle.
      { id: 'firewall', tile: { x: 4, y: 0 } },
      { id: 'start', tile: { x: 0, y: 0 } },
      { id: 'outside', tile: { x: -6, y: 0 } }
    ]
  } as unknown as Partial<SceneShape>);
  // Clear of each node's whole tile (about 141 x 82 px at zoom 1).
  const from = { x: at(0, 0).x - 90, y: at(4, 0).y - 50 };
  const to = { x: at(4, 0).x + 90, y: at(0, 0).y + 50 };

  test('catches what is visibly inside the rectangle', () => {
    expect(
      getItemsInScreenRect({
        from,
        to,
        scene,
        zoom: 1,
        scroll: noScroll,
        rendererSize: canvas
      })
    ).toEqual([
      { type: 'ITEM', id: 'firewall' },
      { type: 'ITEM', id: 'start' }
    ]);
  });

  test('the same drag as a box of tiles missed it', () => {
    // What the old band tested: the box between the tiles under the two
    // corners.
    const tile = (mouse: { x: number; y: number }) => {
      return screenToIso({
        mouse,
        zoom: 1,
        scroll: noScroll,
        rendererSize: canvas
      });
    };
    const found = getItemsInBounds({ from: tile(from), to: tile(to), scene });
    expect(found).not.toContainEqual({ type: 'ITEM', id: 'firewall' });
  });

  test('follows zoom and scroll, as the canvas does', () => {
    const zoom = 0.5;
    const scroll = { position: { x: 100, y: -50 }, offset: { x: 0, y: 0 } };
    const shown = (x: number, y: number) => {
      const p = getTilePosition({ tile: { x, y } });
      return {
        x: canvas.width / 2 + scroll.position.x + p.x * zoom,
        y: canvas.height / 2 + scroll.position.y + p.y * zoom
      };
    };
    const c = shown(4, 0);
    expect(
      getItemsInScreenRect({
        from: { x: c.x - 40, y: c.y - 25 },
        to: { x: c.x + 40, y: c.y + 25 },
        scene,
        zoom,
        scroll,
        rendererSize: canvas
      })
    ).toEqual([{ type: 'ITEM', id: 'firewall' }]);
  });

  test('corner order does not matter, and nothing outside is caught', () => {
    const args = { scene, zoom: 1, scroll: noScroll, rendererSize: canvas };
    expect(getItemsInScreenRect({ ...args, from: to, to: from })).toEqual(
      getItemsInScreenRect({ ...args, from, to })
    );
    const o = at(-6, 0);
    expect(
      getItemsInScreenRect({
        ...args,
        from: { x: o.x + 200, y: o.y - 5 },
        to: { x: o.x + 300, y: o.y + 5 }
      })
    ).toEqual([]);
  });

  test('a node only partly inside, and a connector with an end outside, are not caught', () => {
    const withConnector = makeScene({
      items: [
        { id: 'a', tile: { x: 0, y: 0 } },
        { id: 'b', tile: { x: 4, y: 0 } }
      ],
      connectors: [
        {
          id: 'ab',
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 4, y: 0 } },
            tiles: [0, 1, 2, 3, 4].map((x) => {
              return { x, y: 0 };
            })
          }
        }
      ]
    } as unknown as Partial<SceneShape>);
    const args = {
      scene: withConnector,
      zoom: 1,
      scroll: noScroll,
      rendererSize: canvas
    };
    const a = at(0, 0);
    // Around node a only: a is caught, its connector to b is not.
    expect(
      getItemsInScreenRect({
        ...args,
        from: { x: a.x - 90, y: a.y - 50 },
        to: { x: a.x + 90, y: a.y + 50 }
      })
    ).toEqual([{ type: 'ITEM', id: 'a' }]);
    // Over half of node a: nothing.
    expect(
      getItemsInScreenRect({
        ...args,
        from: { x: a.x - 90, y: a.y - 50 },
        to: { x: a.x, y: a.y + 50 }
      })
    ).toEqual([]);
    // Around both: both nodes and the connector.
    const b = at(4, 0);
    expect(
      getItemsInScreenRect({
        ...args,
        from: { x: a.x - 90, y: b.y - 50 },
        to: { x: b.x + 90, y: a.y + 50 }
      })
    ).toEqual([
      { type: 'ITEM', id: 'a' },
      { type: 'ITEM', id: 'b' },
      { type: 'CONNECTOR', id: 'ab' }
    ]);
  });
});
