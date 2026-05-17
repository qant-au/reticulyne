/**
 * @jest-environment jsdom
 */
import { DragItems } from '../DragItems';
import { makeState, type SceneShape } from './_helpers';
import type { ViewItem, Rectangle, TextBox } from 'src/types';

describe('DragItems mode', () => {
  describe('entry / exit user-select toggling', () => {
    test('entry disables text selection on the renderer DOM node', () => {
      const renderer = document.createElement('div');
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'ITEM', id: 'node1' }],
          isInitialMovement: false
        },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } }
        },
        rendererRef: renderer
      });

      DragItems.entry?.(state);
      expect(renderer.style.userSelect).toBe('none');
    });

    test('entry is a no-op when the mode is wrong', () => {
      const renderer = document.createElement('div');
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } }
        },
        rendererRef: renderer
      });

      DragItems.entry?.(state);
      expect(renderer.style.userSelect).toBe('');
    });

    test('exit re-enables text selection on the renderer DOM node', () => {
      const renderer = document.createElement('div');
      renderer.style.userSelect = 'none';
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [],
          isInitialMovement: false
        },
        rendererRef: renderer
      });

      DragItems.exit?.(state);
      expect(renderer.style.userSelect).toBe('auto');
    });
  });

  describe('mousemove → drag application', () => {
    test('moves an ITEM by the snap-to-pointer delta on initial movement, then clears isInitialMovement', () => {
      const item: ViewItem = {
        id: 'node1',
        tile: { x: 2, y: 2 }
      };
      const sceneOverride: Partial<SceneShape> = {
        items: [{ ...item }] as unknown as SceneShape['items']
      };
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'ITEM', id: 'node1' }],
          isInitialMovement: true
        },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
          position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 7 } },
          // On initial movement the handler computes the delta from
          // mousedown→position rather than using mouse.delta directly.
          delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } }
        },
        scene: sceneOverride
      });

      DragItems.mousemove?.(state);

      expect(state.scene.updateViewItem).toHaveBeenCalledWith('node1', {
        tile: { x: 7, y: 9 } // 2+5, 2+7
      });

      // After applying initial movement the mode flips
      // isInitialMovement=false so subsequent moves use mouse.delta.tile.
      const next = (state.uiState.actions.setMode as jest.Mock).mock
        .calls[0][0];
      expect(next).toEqual(
        expect.objectContaining({
          type: 'DRAG_ITEMS',
          isInitialMovement: false
        })
      );
    });

    test('moves a RECTANGLE by the delta — both corners shift together', () => {
      const rect: Rectangle = {
        id: 'rect-1',
        color: 'color1',
        from: { x: 0, y: 0 },
        to: { x: 4, y: 4 }
      };
      const sceneOverride: Partial<SceneShape> = {
        rectangles: [{ ...rect }] as unknown as SceneShape['rectangles']
      };
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'RECTANGLE', id: 'rect-1' }],
          isInitialMovement: false
        },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
          position: { screen: { x: 0, y: 0 }, tile: { x: 1, y: 1 } },
          delta: { screen: { x: 10, y: 10 }, tile: { x: 1, y: 1 } }
        },
        scene: sceneOverride
      });

      DragItems.mousemove?.(state);

      expect(state.scene.updateRectangle).toHaveBeenCalledWith('rect-1', {
        from: { x: 1, y: 1 },
        to: { x: 5, y: 5 }
      });
    });

    test('moves a TEXTBOX by the delta', () => {
      const tb: TextBox = {
        id: 'tb-1',
        tile: { x: 3, y: 3 },
        content: 'hi'
      };
      const sceneOverride: Partial<SceneShape> = {
        textBoxes: [{ ...tb }] as unknown as SceneShape['textBoxes']
      };
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'TEXTBOX', id: 'tb-1' }],
          isInitialMovement: false
        },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
          position: { screen: { x: 0, y: 0 }, tile: { x: 4, y: 5 } },
          delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 2 } }
        },
        scene: sceneOverride
      });

      DragItems.mousemove?.(state);

      expect(state.scene.updateTextBox).toHaveBeenCalledWith('tb-1', {
        tile: { x: 4, y: 5 } // 3+1, 3+2
      });
    });

    test('non-initial mousemove with zero tile-delta is a no-op (no mouse drag yet between tiles)', () => {
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'ITEM', id: 'node1' }],
          isInitialMovement: false
        },
        mouse: {
          mousedown: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
          position: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } },
          delta: { screen: { x: 1, y: 0 }, tile: { x: 0, y: 0 } }
        }
      });

      DragItems.mousemove?.(state);
      expect(state.scene.updateViewItem).not.toHaveBeenCalled();
    });

    test('mousemove without mousedown is a no-op (defensive — handler entry-guard)', () => {
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'ITEM', id: 'node1' }],
          isInitialMovement: false
        },
        mouse: { mousedown: null }
      });

      DragItems.mousemove?.(state);
      expect(state.scene.updateViewItem).not.toHaveBeenCalled();
    });
  });

  describe('mouseup', () => {
    test('mouseup unconditionally returns to CURSOR mode', () => {
      const state = makeState({
        mode: {
          type: 'DRAG_ITEMS',
          showCursor: true,
          items: [{ type: 'ITEM', id: 'node1' }],
          isInitialMovement: false
        }
      });

      DragItems.mouseup?.(state);

      expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: null
      });
    });
  });
});
