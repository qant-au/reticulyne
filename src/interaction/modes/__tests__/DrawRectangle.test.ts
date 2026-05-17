/**
 * @jest-environment jsdom
 */
import { DrawRectangle } from '../Rectangle/DrawRectangle';
import { makeState, lastModeChange } from './_helpers';

describe('DrawRectangle mode', () => {
  afterEach(() => {
    document.body.style.cursor = '';
  });

  test('entry sets cursor to "crosshair"', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: null }
    });
    DrawRectangle.entry?.(state);
    expect(document.body.style.cursor).toBe('crosshair');
  });

  test('exit restores the cursor to "default"', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: null }
    });
    DrawRectangle.exit?.(state);
    expect(document.body.style.cursor).toBe('default');
  });

  test('mousedown inside the renderer creates a rectangle at the current tile and stashes its id in mode', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: null },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 2, y: 3 } } }
    });

    DrawRectangle.mousedown?.(state);

    expect(state.scene.createRectangle).toHaveBeenCalledTimes(1);
    const arg = (state.scene.createRectangle as jest.Mock).mock.calls[0][0];
    expect(arg.from).toEqual({ x: 2, y: 3 });
    expect(arg.to).toEqual({ x: 2, y: 3 });
    expect(arg.color).toBe('color1');

    const nextMode = lastModeChange(state);
    expect(nextMode).toEqual(
      expect.objectContaining({
        type: 'RECTANGLE.DRAW',
        id: arg.id
      })
    );
  });

  test('mousedown outside the renderer is ignored', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: null },
      isRendererInteraction: false
    });

    DrawRectangle.mousedown?.(state);
    expect(state.scene.createRectangle).not.toHaveBeenCalled();
  });

  test('mousemove during draw updates the rectangle "to" corner', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: 'rect-1' },
      mouse: {
        position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 7 } },
        mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
        delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } }
      }
    });

    DrawRectangle.mousemove?.(state);

    expect(state.scene.updateRectangle).toHaveBeenCalledWith('rect-1', {
      to: { x: 5, y: 7 }
    });
  });

  test('mousemove without an active id is a no-op', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: null },
      mouse: {
        delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } },
        mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } }
      }
    });

    DrawRectangle.mousemove?.(state);
    expect(state.scene.updateRectangle).not.toHaveBeenCalled();
  });

  test('mouseup transitions back to CURSOR mode', () => {
    const state = makeState({
      mode: { type: 'RECTANGLE.DRAW', showCursor: true, id: 'rect-1' }
    });

    DrawRectangle.mouseup?.(state);

    expect(lastModeChange(state)).toEqual({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  });
});
