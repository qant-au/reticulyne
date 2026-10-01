import { produce } from 'immer';
import { ModeActions } from 'src/types';
import { generateId, getItemAtTile } from 'src/utils';
import { VIEW_ITEM_DEFAULTS } from 'src/config';

export const PlaceIcon: ModeActions = {
  mousemove: () => {},
  mousedown: ({ uiState, scene, isRendererInteraction }) => {
    if (uiState.mode.type !== 'PLACE_ICON' || !isRendererInteraction) return;

    if (!uiState.mode.id) {
      const itemAtTile = getItemAtTile({
        tile: uiState.mouse.position.tile,
        scene
      });

      uiState.actions.setMode({
        type: 'CURSOR',
        mousedownItem: itemAtTile,
        showCursor: true
      });

      uiState.actions.setItemControls(null);
    }
  },
  mouseup: ({ uiState, scene, isRendererInteraction }) => {
    if (uiState.mode.type !== 'PLACE_ICON') return;

    // A release outside the canvas never drops an icon (BUG5-07), and it
    // leaves the icon armed: a plain click on a picker icon ends with a
    // release on the picker itself, so disarming here meant only a drag
    // could ever place one. Click the canvas to place it, Esc to cancel.
    if (uiState.mode.id !== null && !isRendererInteraction) return;

    if (uiState.mode.id !== null && isRendererInteraction) {
      // Only commit a placement when the release happens inside the
      // renderer surface. Without this gate, releasing the mouse on
      // the MUI toolbar (or any other overlay) still created a model
      // item at `uiState.mouse.position.tile` — the user dropped onto
      // a UI control and got a stray icon on the canvas. Compare to
      // TextBox.mouseup which uses the same gate to delete the in-
      // progress textbox on out-of-renderer release.
      const { object, template } = uiState.mode;
      const modelItemId = object?.id ?? generateId();

      // A catalogue item is a new object with its ports, links and
      // element each time.
      scene.createModelItem(
        template
          ? { ...template, id: modelItemId }
          : {
              id: modelItemId,
              name: object?.name ?? 'Untitled',
              // A floor-plan object's icon may be none (the default block);
              // the mode's id is then only what the drag preview draws.
              icon: object ? object.icon : uiState.mode.id
            }
      );

      scene.createViewItem({
        ...VIEW_ITEM_DEFAULTS,
        id: modelItemId,
        tile: uiState.mouse.position.tile
      });

      // An object from the floor plan goes in once; back to the
      // cursor with it selected.
      if (object) {
        uiState.actions.setMode({
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: null
        });
        uiState.actions.setSelection([{ type: 'ITEM', id: modelItemId }]);
        return;
      }
    }

    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.id = null;
      })
    );
  }
};
