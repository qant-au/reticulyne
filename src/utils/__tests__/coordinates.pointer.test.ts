/**
 * @jest-environment jsdom
 */
import { getMouse } from '../coordinates';
import { CoordsUtils } from '../CoordsUtils';
import type { Mouse, SlimMouseEvent } from 'src/types';

// Regression guard for the Pointer Events migration (FEA10-01).
//
// `useInteractionManager` dispatches `pointerdown` / `pointermove` /
// `pointerup`, but `getMouse` only recognised the legacy `mousedown` /
// `mousemove` names, so every event fell through to `default` and
// `mouse.mousedown` was pinned at null forever. Everything that guards on
// it — DragItems, Pan, DrawRectangle, and the 1.4 marquee — silently did
// nothing. No test covered it because no test dispatched real pointer
// events at getMouse.

const lastMouse: Mouse = {
  position: { screen: CoordsUtils.zero(), tile: CoordsUtils.zero() },
  mousedown: null,
  delta: null
};

const makeEvent = (type: string, x = 10, y = 20): SlimMouseEvent => {
  return {
    type,
    clientX: x,
    clientY: y,
    target: null,
    preventDefault: () => {}
  } as unknown as SlimMouseEvent;
};

const run = (event: SlimMouseEvent, previous: Mouse = lastMouse) => {
  return getMouse({
    interactiveElement: document.createElement('div'),
    zoom: 1,
    scroll: { position: CoordsUtils.zero(), offset: CoordsUtils.zero() },
    lastMouse: previous,
    mouseEvent: event,
    rendererSize: { width: 100, height: 100 }
  });
};

describe('getMouse — pointer event names', () => {
  test('pointerdown records the press position', () => {
    expect(run(makeEvent('pointerdown')).mousedown).not.toBeNull();
  });

  test('pointermove carries the press position forward', () => {
    const pressed = run(makeEvent('pointerdown'));
    const moved = run(makeEvent('pointermove', 30, 40), pressed);

    // Asserted non-null explicitly: `toEqual(pressed.mousedown)` alone
    // passes vacuously against the pre-fix code, where both sides are null.
    expect(moved.mousedown).not.toBeNull();
    expect(moved.mousedown).toEqual(pressed.mousedown);
    // The press position must NOT track the pointer — it is the anchor a
    // drag measures its delta from, and the marquee its origin corner.
    expect(moved.mousedown).not.toEqual(moved.position);
  });

  test('pointerup clears the press position', () => {
    const pressed = run(makeEvent('pointerdown'));
    expect(pressed.mousedown).not.toBeNull();
    expect(run(makeEvent('pointerup'), pressed).mousedown).toBeNull();
  });

  test('the legacy mouse event names still work', () => {
    expect(run(makeEvent('mousedown')).mousedown).not.toBeNull();

    const pressed = run(makeEvent('mousedown'));
    const moved = run(makeEvent('mousemove', 30, 40), pressed);
    expect(moved.mousedown).not.toBeNull();
    expect(moved.mousedown).toEqual(pressed.mousedown);
  });

  test('an unrelated event type still clears it', () => {
    const pressed = run(makeEvent('pointerdown'));
    expect(run(makeEvent('pointercancel'), pressed).mousedown).toBeNull();
  });
});
