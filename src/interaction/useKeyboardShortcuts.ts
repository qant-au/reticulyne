import { useEffect } from 'react';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getItemByIdOrThrow } from 'src/utils';
import type { ItemReference } from 'src/types';

const NUDGE_STEP = 1;
const SHIFT_MULTIPLIER = 5;

const isEditableFocus = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
};

export const useKeyboardShortcuts = () => {
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const {
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    updateViewItem,
    updateTextBox,
    updateRectangle,
    currentView
  } = useScene();

  useEffect(() => {
    const isEditable = editorMode === 'EDITABLE';

    const nudgeSelected = (dx: number, dy: number, selected: ItemReference) => {
      if (selected.type === 'ITEM') {
        const view = currentView.items ?? [];
        const vi = getItemByIdOrThrow(view, selected.id).value;
        updateViewItem(selected.id, {
          tile: { x: vi.tile.x + dx, y: vi.tile.y + dy }
        });
        return;
      }
      if (selected.type === 'TEXTBOX') {
        const tb = getItemByIdOrThrow(
          currentView.textBoxes ?? [],
          selected.id
        ).value;
        updateTextBox(selected.id, {
          tile: { x: tb.tile.x + dx, y: tb.tile.y + dy }
        });
        return;
      }
      if (selected.type === 'RECTANGLE') {
        const r = getItemByIdOrThrow(
          currentView.rectangles ?? [],
          selected.id
        ).value;
        updateRectangle(selected.id, {
          from: { x: r.from.x + dx, y: r.from.y + dy },
          to: { x: r.to.x + dx, y: r.to.y + dy }
        });
      }
    };

    const deleteSelected = (selected: ItemReference) => {
      switch (selected.type) {
        case 'ITEM':
          deleteViewItem(selected.id);
          break;
        case 'TEXTBOX':
          deleteTextBox(selected.id);
          break;
        case 'RECTANGLE':
          deleteRectangle(selected.id);
          break;
        case 'CONNECTOR':
          deleteConnector(selected.id);
          break;
        default:
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't steal keys from text inputs or contenteditable surfaces
      // (Quill descriptions, MUI TextFields, etc).
      if (isEditableFocus(e.target)) return;

      // Escape: deselect. Allowed in every editor mode — read-only
      // diagrams may still surface a selection-driven detail panel.
      if (e.key === 'Escape') {
        if (itemControls) {
          uiStateActions.setItemControls(null);
          e.preventDefault();
        }
        return;
      }

      // Remaining shortcuts only fire in editable mode.
      if (!isEditable) return;

      const selected =
        itemControls && itemControls.type !== 'ADD_ITEM' ? itemControls : null;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selected) return;
        deleteSelected(selected);
        uiStateActions.setItemControls(null);
        e.preventDefault();
        return;
      }

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (!selected) return;
        const step = NUDGE_STEP * (e.shiftKey ? SHIFT_MULTIPLIER : 1);
        let dx = 0;
        let dy = 0;
        switch (e.key) {
          case 'ArrowUp':
            dy = -step;
            break;
          case 'ArrowDown':
            dy = step;
            break;
          case 'ArrowLeft':
            dx = -step;
            break;
          case 'ArrowRight':
            dx = step;
            break;
          default:
            break;
        }
        nudgeSelected(dx, dy, selected);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    editorMode,
    itemControls,
    uiStateActions,
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    updateViewItem,
    updateTextBox,
    updateRectangle,
    currentView
  ]);
};
