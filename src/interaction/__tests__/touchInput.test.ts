import { startPinch, updatePinch } from '../touchInput';
import { MAX_ZOOM, MIN_ZOOM } from 'src/config';

// ROADMAP 2.12: the pinch maths.
const size = { width: 1000, height: 800 };
const toScreen = (
  p: { x: number; y: number },
  zoom: number,
  scroll: { x: number; y: number }
) => {
  return {
    x: size.width / 2 + scroll.x + p.x * zoom,
    y: size.height / 2 + scroll.y + p.y * zoom
  };
};

describe('pinch-to-zoom', () => {
  test('fingers that do not move change nothing', () => {
    const a = { x: 400, y: 300 };
    const b = { x: 600, y: 500 };
    const s = startPinch(a, b, 0.6, { x: 20, y: -10 }, size);
    const r = updatePinch(s, a, b, size);
    expect(r.zoom).toBeCloseTo(0.6);
    expect(r.scroll.x).toBeCloseTo(20);
    expect(r.scroll.y).toBeCloseTo(-10);
  });

  test('spreading zooms in and keeps the point under the midpoint fixed', () => {
    const s = startPinch(
      { x: 450, y: 400 },
      { x: 550, y: 400 },
      0.4,
      { x: 0, y: 0 },
      size
    );
    const r = updatePinch(s, { x: 400, y: 400 }, { x: 600, y: 400 }, size);
    expect(r.zoom).toBeCloseTo(0.8);
    const under = toScreen(s.anchor, r.zoom, r.scroll);
    expect(under.x).toBeCloseTo(500);
    expect(under.y).toBeCloseTo(400);
  });

  test('moving both fingers together pans by the same amount', () => {
    const s = startPinch(
      { x: 400, y: 400 },
      { x: 600, y: 400 },
      0.5,
      { x: 0, y: 0 },
      size
    );
    const r = updatePinch(s, { x: 430, y: 380 }, { x: 630, y: 380 }, size);
    expect(r.zoom).toBeCloseTo(0.5);
    expect(r.scroll.x).toBeCloseTo(30);
    expect(r.scroll.y).toBeCloseTo(-20);
  });

  test('zoom is clamped to the editor range', () => {
    const s = startPinch(
      { x: 490, y: 400 },
      { x: 510, y: 400 },
      0.5,
      { x: 0, y: 0 },
      size
    );
    expect(
      updatePinch(s, { x: 0, y: 400 }, { x: 1000, y: 400 }, size).zoom
    ).toBe(MAX_ZOOM);
    expect(
      updatePinch(s, { x: 499, y: 400 }, { x: 501, y: 400 }, size).zoom
    ).toBe(MIN_ZOOM);
  });
});
