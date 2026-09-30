import { decrementZoom, incrementZoom, zoomLadder } from '../projection';
import { MAX_ZOOM, MIN_ZOOM } from 'src/config';

// Sweep 2026-09-30: from Fit's 64%, Zoom in went 64 -> 84 -> 100 and Zoom
// out then 100 -> 80 -> 60, never back to 64%. In and out now step through
// one ladder that keeps the level the zoom was set to.
describe('zoom steps', () => {
  test('in then out returns exactly to an off-ladder level, across the clamp', () => {
    const fit = 0.64;
    const in1 = incrementZoom(fit, fit);
    const in2 = incrementZoom(in1, fit);
    expect([in1, in2]).toEqual([0.8, 1]);
    const out1 = decrementZoom(in2, fit);
    const out2 = decrementZoom(out1, fit);
    expect([out1, out2]).toEqual([0.8, 0.64]);
    expect(decrementZoom(out2, fit)).toBe(0.6);
    expect(incrementZoom(0.6, fit)).toBe(0.64);
  });

  test('without an anchor the current level is kept on the ladder', () => {
    expect(incrementZoom(0.64)).toBe(0.8);
    expect(decrementZoom(0.64)).toBe(0.6);
  });

  test('steps from a whole step stay on whole steps', () => {
    expect(decrementZoom(1)).toBe(0.8);
    expect(decrementZoom(0.8)).toBe(0.6);
    expect(incrementZoom(0.6)).toBe(0.8);
  });

  test('no floating-point noise after many steps', () => {
    let z = 0.2;
    for (let i = 0; i < 4; i += 1) z = incrementZoom(z);
    expect(z).toBe(1);
    expect(zoomLadder()).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
  });

  test('clamped at either end', () => {
    expect(incrementZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(decrementZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
  });
});
