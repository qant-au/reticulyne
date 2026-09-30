import { decrementZoom, incrementZoom } from '../projection';
import { MAX_ZOOM, MIN_ZOOM } from 'src/config';

// Sweep 2026-09-30: from Fit's 64%, Zoom in went to 80% and Zoom out then
// to 60%, not back to 64%: each step was rounded to a tenth.
describe('zoom steps', () => {
  test('zoom out retraces zoom in from an off-step zoom', () => {
    expect(incrementZoom(0.64)).toBe(0.84);
    expect(decrementZoom(incrementZoom(0.64))).toBe(0.64);
    expect(incrementZoom(decrementZoom(0.64))).toBe(0.64);
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
  });

  test('clamped at either end', () => {
    expect(incrementZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(decrementZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
  });
});
