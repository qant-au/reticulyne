/**
 * @jest-environment jsdom
 */
import { Cursor } from '../Cursor';
import { makeState, lastModeChange, type SceneShape } from './_helpers';
import type { ViewItem } from 'src/types';

const itemAt = (id: string, tile: { x: number; y: number }): ViewItem => {
  return { id, tile };
};

const sceneWithItems = (items: ViewItem[]): Partial<SceneShape> => {
  return {
    items: items as unknown as SceneShape['items']
  };
};

describe('Cursor mode', () => {
  describe('mousedown', () => {
    test('mousedown on a tile holding an ITEM stashes that item on mode.mousedownItem and opens its inspector', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 2, y: 2 } } },
        scene: sceneWithItems([itemAt('node1', { x: 2, y: 2 })])
      });

      Cursor.mousedown?.(state);

      const next = lastModeChange(state);
      expect(next).toEqual(
        expect.objectContaining({
          type: 'CURSOR',
          mousedownItem: { type: 'ITEM', id: 'node1' }
        })
      );
      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith({
        type: 'ITEM',
        id: 'node1'
      });
    });

    test('mousedown on an empty tile clears mousedownItem and itemControls', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 5, y: 5 } } },
        scene: sceneWithItems([itemAt('node1', { x: 0, y: 0 })])
      });

      Cursor.mousedown?.(state);

      const next = lastModeChange(state);
      expect(next).toEqual(
        expect.objectContaining({
          type: 'CURSOR',
          mousedownItem: null
        })
      );
      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
    });

    test('mousedown outside the renderer is ignored', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        isRendererInteraction: false
      });

      Cursor.mousedown?.(state);
      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    });
  });

  describe('mousemove', () => {
    test('mousemove with mousedownItem promotes to DRAG_ITEMS once the cursor moves a tile', () => {
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: { type: 'ITEM', id: 'node1' }
        },
        mouse: {
          delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 0 } }
        }
      });

      Cursor.mousemove?.(state);

      expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
        type: 'DRAG_ITEMS',
        showCursor: true,
        items: [{ type: 'ITEM', id: 'node1' }],
        isInitialMovement: true
      });
    });

    test('mousemove with no tile delta does not transition (still mousing over the same tile)', () => {
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: { type: 'ITEM', id: 'node1' }
        },
        mouse: {
          delta: { screen: { x: 1, y: 1 }, tile: { x: 0, y: 0 } }
        }
      });

      Cursor.mousemove?.(state);
      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    });

    test('mousemove without a held item is a no-op (does not start dragging from empty space)', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        mouse: {
          delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } }
        }
      });

      Cursor.mousemove?.(state);
      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    });
  });

  describe('mouseup', () => {
    test('mouseup with a stashed RECTANGLE opens the RECTANGLE inspector', () => {
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: { type: 'RECTANGLE', id: 'rect-1' }
        }
      });

      Cursor.mouseup?.(state);

      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith({
        type: 'RECTANGLE',
        id: 'rect-1'
      });
      // And mousedownItem is cleared on the next mode tick.
      const next = lastModeChange(state);
      expect(next).toEqual(
        expect.objectContaining({
          type: 'CURSOR',
          mousedownItem: null
        })
      );
    });

    test('mouseup with a stashed TEXTBOX opens the TEXTBOX inspector', () => {
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: { type: 'TEXTBOX', id: 'tb-1' }
        }
      });

      Cursor.mouseup?.(state);

      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith({
        type: 'TEXTBOX',
        id: 'tb-1'
      });
    });

    test('mouseup with no stashed item clears itemControls', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null }
      });

      Cursor.mouseup?.(state);

      expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
    });

    test('mouseup outside the renderer with no stashed item is a no-op', () => {
      const state = makeState({
        mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
        isRendererInteraction: false
      });

      Cursor.mouseup?.(state);
      expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });

    test('mouseup outside the renderer with a stashed item clears mousedownItem (BUG5-03 regression)', () => {
      // Reproduces the stuck-drag UX bug: mousedown on a tile, drag
      // off the canvas, release on the MUI toolbar (or off the
      // window). Before BUG5-03 the guard short-circuited the entire
      // handler, leaving mousedownItem set. The next mousemove back
      // into the renderer would promote to DRAG_ITEMS with no button
      // held — the item then followed the cursor until the user
      // clicked.
      const state = makeState({
        mode: {
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: { type: 'ITEM', id: 'node1' }
        },
        isRendererInteraction: false
      });

      Cursor.mouseup?.(state);

      // The stashed mousedownItem must be cleared so the next
      // mousemove can't promote to DRAG_ITEMS.
      const next = lastModeChange(state);
      expect(next).toEqual(
        expect.objectContaining({
          type: 'CURSOR',
          mousedownItem: null
        })
      );

      // But we must NOT reach into the inspector — toolbar clicks
      // manage their own selection.
      expect(state.uiState.actions.setItemControls).not.toHaveBeenCalled();
    });
  });
});
