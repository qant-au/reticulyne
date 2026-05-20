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

    if (uiState.mode.id !== null && isRendererInteraction) {
      // Only commit a placement when the release happens inside the
      // renderer surface. Without this gate, releasing the mouse on
      // the MUI toolbar (or any other overlay) still created a model
      // item at `uiState.mouse.position.tile` — the user dropped onto
      // a UI control and got a stray icon on the canvas. Compare to
      // TextBox.mouseup which uses the same gate to delete the in-
      // progress textbox on out-of-renderer release.
      const modelItemId = generateId();

      scene.createModelItem({
        id: modelItemId,
        name: 'Untitled',
        icon: uiState.mode.id
      });

      scene.createViewItem({
        ...VIEW_ITEM_DEFAULTS,
        id: modelItemId,
        tile: uiState.mouse.position.tile
      });
    }

    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.id = null;
      })
    );
  }
};
