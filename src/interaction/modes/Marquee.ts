import { produce } from 'immer';
import { ModeActions } from 'src/types';
import { getItemsInBounds } from 'src/utils';

// 1.4: marquee ("rubber band") drag-select.
//
// Entered from CURSOR when the user presses on empty canvas and moves —
// pressing on an item promotes to DRAG_ITEMS instead, so the two never
// compete for the same gesture.
//
// The selection is recomputed live on every mousemove rather than only at
// mouseup, so the user sees what the band has caught while still dragging,
// the way Excalidraw does. That means the store is written on each move;
// it is a single `set` of a small array, and the alternative (commit on
// release only) reads as a broken band.
//
// Read-only guard: the mode is only ever entered from Cursor, which itself
// only runs in modes that permit editing. Marquee additionally refuses to
// run outside EDITABLE so a stray mode set from a host cannot make a
// read-only diagram selectable in bulk.
export const Marquee: ModeActions = {
  entry: ({ rendererRef }) => {
    const renderer = rendererRef;
    // Suppress native text selection for the duration of the band, same as
    // DragItems does — without it the drag paints a browser text highlight
    // over the whole canvas.
    renderer.style.userSelect = 'none';
  },

  exit: ({ rendererRef }) => {
    const renderer = rendererRef;
    renderer.style.userSelect = 'auto';
  },

  mousemove: ({ uiState, scene }) => {
    if (uiState.mode.type !== 'MARQUEE') return;
    if (uiState.editorMode !== 'EDITABLE') return;

    const to = uiState.mouse.position.tile;

    uiState.actions.setMode(
      produce(uiState.mode, (draft) => {
        draft.to = to;
      })
    );

    const caught = getItemsInBounds({
      from: uiState.mode.from,
      to,
      scene
    });

    // Always `base ∪ caught`, recomputed from scratch — see the MarqueeMode
    // doc comment for why this must not accumulate onto the last frame.
    // `base` is empty for a plain drag, so that case reduces to `caught`.
    const { base } = uiState.mode;
    const fresh = caught.filter((item) => {
      return !base.some((s) => {
        return s.type === item.type && s.id === item.id;
      });
    });

    uiState.actions.setSelection([...base, ...fresh]);
  },

  mouseup: ({ uiState }) => {
    uiState.actions.setMode({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  }
};
