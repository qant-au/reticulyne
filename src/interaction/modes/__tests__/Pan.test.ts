/**
 * @jest-environment jsdom
 */
import { Pan } from '../Pan';
import { makeState } from './_helpers';

describe('Pan mode', () => {
  afterEach(() => {
    document.body.style.cursor = '';
  });

  test('entry sets the window cursor to "grab"', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false }
    });
    Pan.entry?.(state);
    expect(document.body.style.cursor).toBe('grab');
  });

  test('exit restores the window cursor to "default"', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false }
    });
    Pan.exit?.(state);
    expect(document.body.style.cursor).toBe('default');
  });

  test('mousedown inside the renderer sets cursor to "grabbing"', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false },
      isRendererInteraction: true
    });
    Pan.mousedown?.(state);
    expect(document.body.style.cursor).toBe('grabbing');
  });

  test('mousedown outside the renderer is ignored', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false },
      isRendererInteraction: false
    });
    document.body.style.cursor = 'previous';
    Pan.mousedown?.(state);
    expect(document.body.style.cursor).toBe('previous');
  });

  test('mousemove without mousedown is a no-op', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false },
      mouse: { mousedown: null }
    });
    Pan.mousemove?.(state);
    expect(state.uiState.actions.setScroll).not.toHaveBeenCalled();
  });

  test('mousemove while dragging adds the screen delta to scroll', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false },
      mouse: {
        mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
        delta: { screen: { x: 17, y: -4 }, tile: { x: 0, y: 0 } }
      },
      scroll: { position: { x: 100, y: 50 }, offset: { x: 0, y: 0 } }
    });

    Pan.mousemove?.(state);

    expect(state.uiState.actions.setScroll).toHaveBeenCalledTimes(1);
    expect(state.uiState.actions.setScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        position: { x: 117, y: 46 }
      })
    );
  });

  test('mouseup restores the cursor to "grab" (ready for next drag)', () => {
    const state = makeState({
      mode: { type: 'PAN', showCursor: false }
    });
    Pan.mouseup?.(state);
    expect(document.body.style.cursor).toBe('grab');
  });

  test('mousemove ignored when mode.type !== PAN', () => {
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: {
        mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
        delta: { screen: { x: 17, y: -4 }, tile: { x: 0, y: 0 } }
      }
    });

    Pan.mousemove?.(state);
    expect(state.uiState.actions.setScroll).not.toHaveBeenCalled();
  });
});
