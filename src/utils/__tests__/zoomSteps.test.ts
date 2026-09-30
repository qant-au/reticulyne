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
    expect(decrementZoom(out2, fit)).toBe(0.4);
    expect(incrementZoom(0.4, fit)).toBe(0.64);
  });

  test('without an anchor the current level is kept on the ladder', () => {
    expect(incrementZoom(0.64)).toBe(0.8);
    expect(decrementZoom(0.64)).toBe(0.4);
  });

  // Sweep 2026-09-30: from Fit's 64% zoom out stepped 64 -> 60, a 4-point
  // step. A level within half a step of a rung now replaces that rung.
  test('the Fit level replaces a rung it lands close to', () => {
    expect(zoomLadder(0.64)).toEqual([0.2, 0.4, 0.64, 0.8, 1]);
    expect(zoomLadder(0.47)).toEqual([0.2, 0.47, 0.6, 0.8, 1]);
    expect(zoomLadder(0.7)).toEqual([0.2, 0.4, 0.6, 0.7, 0.8, 1]);
    // The limits stay reachable.
    expect(zoomLadder(0.96)).toEqual([0.2, 0.4, 0.6, 0.8, 0.96, 1]);
    expect(zoomLadder(0.25)).toEqual([0.2, 0.25, 0.4, 0.6, 0.8, 1]);
  });

  test('in and out retrace exactly for any Fit level', () => {
    for (let p = 20; p <= 100; p += 1) {
      const fit = p / 100;
      const up = [fit];
      while (incrementZoom(up[up.length - 1], fit) !== up[up.length - 1]) {
        up.push(incrementZoom(up[up.length - 1], fit));
      }
      for (let i = up.length - 1; i > 0; i -= 1) {
        expect(decrementZoom(up[i], fit)).toBe(up[i - 1]);
      }
    }
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
