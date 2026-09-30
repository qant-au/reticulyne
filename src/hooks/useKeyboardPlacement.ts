import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { VIEW_ITEM_DEFAULTS } from 'src/config';
import { freeTileNear, generateId, screenToIso } from 'src/utils';
import type { Coords } from 'src/types';

// lw-068: adding things without a pointer. A pointer puts an item where
// it is released; the keyboard has no such place, so it uses the free
// tile nearest the middle of the view, and the arrow keys nudge it on.
export const useKeyboardPlacement = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const scene = useScene();
  const { createModelItem, createViewItem, createRectangle, currentView } =
    scene;

  /** The tile in the middle of the view as it is now. */
  const centreTile = useCallback((): Coords => {
    const { zoom, scroll, rendererEl } = uiStateActions.get();
    const rendererSize = {
      width: rendererEl?.clientWidth ?? 0,
      height: rendererEl?.clientHeight ?? 0
    };
    return screenToIso({
      mouse: { x: rendererSize.width / 2, y: rendererSize.height / 2 },
      zoom,
      scroll,
      rendererSize,
      projection: scene.projection
    });
  }, [uiStateActions, scene.projection]);

  /**
   * Put an icon (or a floor-plan object, which keeps its id) on `at`, or
   * on the free tile nearest the middle of the view; select it and go
   * back to the cursor. Returns the new node's id.
   */
  const placeIcon = useCallback(
    (
      iconId: string,
      object?: { id: string; name: string; icon?: string },
      at?: Coords
    ) => {
      const id = object?.id ?? generateId();
      createModelItem({
        id,
        name: object?.name ?? 'Untitled',
        icon: object ? object.icon : iconId
      });
      createViewItem({
        ...VIEW_ITEM_DEFAULTS,
        id,
        tile: at ?? freeTileNear(currentView, centreTile())
      });
      uiStateActions.setMode({
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: null
      });
      uiStateActions.setSelection([{ type: 'ITEM', id }]);
      uiStateActions.announce(
        `Added ${object?.name ?? 'an item'}. Arrow keys move it, Enter names it.`
      );
      return id;
    },
    [createModelItem, createViewItem, currentView, centreTile, uiStateActions]
  );

  /** A 3 by 3 rectangle in the middle of the view, selected. */
  const drawRectangle = useCallback(() => {
    const id = generateId();
    const middle = centreTile();
    createRectangle({
      id,
      color: scene.colors[0]?.id,
      from: { x: middle.x - 1, y: middle.y + 1 },
      to: { x: middle.x + 1, y: middle.y - 1 }
    });
    uiStateActions.setMode({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
    uiStateActions.setSelection([{ type: 'RECTANGLE', id }]);
    uiStateActions.announce('Added a rectangle. Arrow keys move it.');
    return id;
  }, [centreTile, createRectangle, scene.colors, uiStateActions]);

  return { centreTile, placeIcon, drawRectangle };
};
