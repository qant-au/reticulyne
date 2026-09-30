import { pointOnMap } from '../MiniMap';

// Sweep 2026-09-30 (A14c): a press on the mini-map that carried on across
// the canvas moved the view to wherever the pointer went, far past the
// diagram, and the canvas looked blank. A drag off the map stays at its
// edge.
describe('pointOnMap', () => {
  const box = { left: 1224, top: 735 };

  test('a pointer on the map is where it is', () => {
    expect(pointOnMap({ x: 1300, y: 800 }, box)).toEqual({ x: 76, y: 65 });
  });

  test('a drag off the map, across the canvas, stays at its edge', () => {
    expect(pointOnMap({ x: 500, y: 600 }, box)).toEqual({ x: 0, y: 0 });
    expect(pointOnMap({ x: 2000, y: 2000 }, box)).toEqual({ x: 200, y: 150 });
  });
});
