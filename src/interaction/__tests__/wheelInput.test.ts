import {
  interpretWheelEvent,
  PIXELS_PER_STEP,
  PIXELS_PER_LINE
} from '../wheelInput';

// Helper: build a minimal wheel-event-shaped object. We don't need a
// real DOM WheelEvent — the helper is typed against a structural
// subset.
const makeEvent = (
  overrides: Partial<{
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    ctrlKey: boolean;
    metaKey: boolean;
  }> = {}
) => {
  return {
    deltaX: 0,
    deltaY: 0,
    deltaMode: 0,
    ctrlKey: false,
    metaKey: false,
    ...overrides
  };
};

describe('interpretWheelEvent', () => {
  describe('zoom branch (modifier held)', () => {
    test('Ctrl+wheel down (positive deltaY, pixel mode) is treated as zoom and accumulates', () => {
      // Single trackpad tick of 50 px with Ctrl — under the
      // PIXELS_PER_STEP threshold of 100, so no whole step yet.
      const result = interpretWheelEvent(
        makeEvent({ deltaY: 50, ctrlKey: true }),
        0
      );
      expect(result.kind).toBe('zoom');
      if (result.kind !== 'zoom') return;
      expect(result.steps).toBe(0);
      expect(result.nextZoomBuffer).toBeCloseTo(0.5);
    });

    test('Ctrl+wheel down crossing the threshold emits one zoom-out step', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaY: PIXELS_PER_STEP, ctrlKey: true }),
        0
      );
      expect(result.kind).toBe('zoom');
      if (result.kind !== 'zoom') return;
      // Positive deltaY = zoom out → negative steps.
      expect(result.steps).toBe(-1);
      expect(result.nextZoomBuffer).toBe(0);
    });

    test('Cmd+wheel up emits a zoom-in step (Mac cross-platform)', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaY: -PIXELS_PER_STEP, metaKey: true }),
        0
      );
      expect(result.kind).toBe('zoom');
      if (result.kind !== 'zoom') return;
      // Negative deltaY = zoom in → positive steps.
      expect(result.steps).toBe(1);
    });

    test('Ctrl+wheel ignores deltaX (zoom is vertical-only)', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaX: 9999, deltaY: 0, ctrlKey: true }),
        0
      );
      expect(result.kind).toBe('zoom');
      if (result.kind !== 'zoom') return;
      expect(result.steps).toBe(0);
    });

    test('line-mode (deltaMode=1) Ctrl+wheel click emits exactly one step', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaY: 1, deltaMode: 1, ctrlKey: true }),
        0
      );
      expect(result.kind).toBe('zoom');
      if (result.kind !== 'zoom') return;
      expect(result.steps).toBe(-1);
    });

    test('buffer carries fractional steps across multiple calls', () => {
      // Three half-threshold ticks → buffer accumulates 0.5 → 1.0
      // (one step emitted, buffer reset to 0) → 0.5 again.
      let buf = 0;
      let r = interpretWheelEvent(
        makeEvent({ deltaY: 50, ctrlKey: true }),
        buf
      );
      if (r.kind !== 'zoom') throw new Error('unreachable');
      buf = r.nextZoomBuffer;
      expect(r.steps).toBe(0);
      expect(buf).toBeCloseTo(0.5);

      r = interpretWheelEvent(makeEvent({ deltaY: 50, ctrlKey: true }), buf);
      if (r.kind !== 'zoom') throw new Error('unreachable');
      buf = r.nextZoomBuffer;
      expect(r.steps).toBe(-1);
      expect(buf).toBeCloseTo(0);

      r = interpretWheelEvent(makeEvent({ deltaY: 50, ctrlKey: true }), buf);
      if (r.kind !== 'zoom') throw new Error('unreachable');
      buf = r.nextZoomBuffer;
      expect(r.steps).toBe(0);
      expect(buf).toBeCloseTo(0.5);
    });
  });

  describe('pan branch (no modifier)', () => {
    test('plain wheel down (positive deltaY) returns a NEGATIVE panDy so scene shifts up', () => {
      const result = interpretWheelEvent(makeEvent({ deltaY: 80 }), 0);
      expect(result.kind).toBe('pan');
      if (result.kind !== 'pan') return;
      // Sign convention: positive deltaY = "user wants to look
      // further down through content" = scene translates up =
      // scroll.position.y decreases. So panDy is negative.
      expect(result.panDy).toBe(-80);
      expect(result.panDx).toBe(0);
    });

    test('plain wheel up (negative deltaY) returns a POSITIVE panDy so scene shifts down', () => {
      const result = interpretWheelEvent(makeEvent({ deltaY: -80 }), 0);
      expect(result.kind).toBe('pan');
      if (result.kind !== 'pan') return;
      expect(result.panDy).toBe(80);
    });

    test('horizontal scroll (deltaX, Magic Mouse / trackpad) pans horizontally', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaX: 40, deltaY: 0 }),
        0
      );
      expect(result.kind).toBe('pan');
      if (result.kind !== 'pan') return;
      expect(result.panDx).toBe(-40);
      expect(result.panDy).toBe(0);
    });

    test('mixed deltaX+deltaY (diagonal trackpad swipe) pans diagonally', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaX: 12, deltaY: -34 }),
        0
      );
      expect(result.kind).toBe('pan');
      if (result.kind !== 'pan') return;
      expect(result.panDx).toBe(-12);
      expect(result.panDy).toBe(34);
    });

    test('line-mode (deltaMode=1) wheel click pans by PIXELS_PER_LINE px', () => {
      const result = interpretWheelEvent(
        makeEvent({ deltaY: 1, deltaMode: 1 }),
        0
      );
      expect(result.kind).toBe('pan');
      if (result.kind !== 'pan') return;
      expect(result.panDy).toBe(-PIXELS_PER_LINE);
    });

    test('pan branch does not consume the zoom buffer', () => {
      // Caller must not regress on this — a pan tick following an
      // accumulating zoom must leave the buffer alone. We model this
      // by simply ensuring the pan result has no buffer field;
      // useInteractionManager only updates the buffer on the zoom
      // branch.
      const result = interpretWheelEvent(makeEvent({ deltaY: 50 }), 0.7);
      expect(result.kind).toBe('pan');
      // No nextZoomBuffer on pan results — TS keeps the buffer in
      // the closure untouched, so this is a structural guarantee.
      expect(
        (result as { nextZoomBuffer?: number }).nextZoomBuffer
      ).toBeUndefined();
    });
  });
});
