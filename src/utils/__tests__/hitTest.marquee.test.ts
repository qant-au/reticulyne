import { getItemsInBounds } from '../hitTest';
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

  test('a rectangle the band merely crosses is caught (intersection, not containment)', () => {
    const scene = makeScene({
      rectangles: [{ id: 'big', from: { x: -10, y: 2 }, to: { x: 10, y: 3 } }]
    } as unknown as Partial<SceneShape>);

    const found = getItemsInBounds({
      from: { x: 0, y: 0 },
      to: { x: 5, y: 5 },
      scene
    });

    expect(found).toEqual([{ type: 'RECTANGLE', id: 'big' }]);
  });

  test('a connector is caught when any path tile is inside', () => {
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
    ).toEqual([{ type: 'CONNECTOR', id: 'con' }]);
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
