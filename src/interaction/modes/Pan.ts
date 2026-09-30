import { produce } from 'immer';
import { CoordsUtils, setWindowCursor } from 'src/utils';
import { ModeActions } from 'src/types';

// lw-087: at rest, the hand shows only in an editable diagram, where it
// says "this is the hand tool, not select". Read-only has nothing else to
// do with a press, so it keeps the default cursor, and grabbing only while
// a pan is actually under way.
const restingCursor = (editorMode: string) => {
  return editorMode === 'EDITABLE' ? 'grab' : 'default';
};

export const Pan: ModeActions = {
  entry: ({ uiState }) => {
    setWindowCursor(restingCursor(uiState.editorMode));
  },
  exit: () => {
    setWindowCursor('default');
  },
  mousemove: ({ uiState }) => {
    if (uiState.mode.type !== 'PAN') return;

    if (uiState.mouse.mousedown !== null) {
      const newScroll = produce(uiState.scroll, (draft) => {
        draft.position = uiState.mouse.delta?.screen
          ? CoordsUtils.add(draft.position, uiState.mouse.delta.screen)
          : draft.position;
      });

      uiState.actions.setScroll(newScroll);
    }
  },
  mousedown: ({ uiState, isRendererInteraction }) => {
    if (uiState.mode.type !== 'PAN' || !isRendererInteraction) return;

    setWindowCursor('grabbing');
  },
  mouseup: ({ uiState }) => {
    setWindowCursor(restingCursor(uiState.editorMode));
  }
};
