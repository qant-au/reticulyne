import { useEffect, useRef } from 'react';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { getItemByIdOrThrow, generateId } from 'src/utils';
import { TEXTBOX_DEFAULTS } from 'src/config';
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

// FEA5-02: keyboard shortcuts that match the conventions of modern
// canvas editors (Figma / Miro / Excalidraw / tldraw).
//
// Single-letter tool switches (V/S/H/A/R/C/T) plus zoom hotkeys
// (+ / - / 0 / 1 / F). Tool switches and duplicate fire only in
// EDITABLE mode; zoom + fit-to-view fire in any mode that allows
// zooming (EDITABLE and EXPLORABLE_READONLY).
//
// Tool letters intentionally double up on Ctrl/Cmd-chord variants
// (Ctrl+C copy, Ctrl+V paste, Ctrl+D duplicate). We dispatch the
// chord handler only when the modifier is held, and the bare letter
// only when it's NOT held — so the conventions don't collide.
export const useKeyboardShortcuts = (enableGlobalKeyboardShortcuts = true) => {
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  // FEA-07: when shortcuts are scoped, bind to the renderer element so
  // keys only fire while the canvas (or a descendant) has focus, instead
  // of hijacking the host page's global keystrokes.
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const dialog = useUiStateStore((state) => {
    return state.dialog;
  });
  // PRF-02: subscribe to mousePosition but keep it out of the keydown
  // effect's dep array — the T textbox tool reads the live value via
  // mousePositionRef at fire time, so the listener doesn't re-bind on
  // every pointermove.
  const mousePosition = useUiStateStore((state) => {
    return state.mouse.position.tile;
  });
  const mousePositionRef = useRef(mousePosition);
  useEffect(() => {
    mousePositionRef.current = mousePosition;
  }, [mousePosition]);
  const {
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    updateViewItem,
    updateTextBox,
    updateRectangle,
    duplicateItem,
    createTextBox,
    copySelection,
    paste,
    undo,
    redo,
    currentView
  } = useScene();
  const { fitToView } = useDiagramUtils();

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

    const selectTool = () => {
      uiStateActions.setMode({
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: null
      });
    };

    const handTool = () => {
      uiStateActions.setMode({ type: 'PAN', showCursor: false });
      uiStateActions.setItemControls(null);
    };

    const addItemTool = () => {
      uiStateActions.setItemControls({ type: 'ADD_ITEM' });
      uiStateActions.setMode({
        type: 'PLACE_ICON',
        showCursor: true,
        id: null
      });
    };

    const rectangleTool = () => {
      uiStateActions.setMode({
        type: 'RECTANGLE.DRAW',
        showCursor: true,
        id: null
      });
    };

    const connectorTool = () => {
      uiStateActions.setMode({ type: 'CONNECTOR', id: null, showCursor: true });
    };

    const textTool = () => {
      const textBoxId = generateId();
      createTextBox({
        ...TEXTBOX_DEFAULTS,
        id: textBoxId,
        tile: mousePositionRef.current
      });
      uiStateActions.setMode({
        type: 'TEXTBOX',
        showCursor: false,
        id: textBoxId
      });
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

      const hasModifier = e.ctrlKey || e.metaKey;

      // === Zoom + fit-to-view (work in EDITABLE and EXPLORABLE_READONLY) ===
      // The zoom keys mirror what every canvas editor uses; we only
      // wire the bare-key form so the browser keeps its native
      // Ctrl+= / Ctrl+- (page zoom).
      if (!hasModifier) {
        if (e.key === '+' || e.key === '=') {
          uiStateActions.incrementZoom();
          e.preventDefault();
          return;
        }
        if (e.key === '-' || e.key === '_') {
          uiStateActions.decrementZoom();
          e.preventDefault();
          return;
        }
        if (e.key === '0' || e.key === '1') {
          uiStateActions.setZoom(1);
          e.preventDefault();
          return;
        }
        if (e.key === 'f' || e.key === 'F') {
          fitToView();
          e.preventDefault();
          return;
        }
      }

      // ? → toggle keyboard shortcuts dialog (works in all modes)
      if (!hasModifier && e.key === '?') {
        if (dialog === 'KEYBOARD_SHORTCUTS') {
          uiStateActions.setDialog(null);
        } else {
          uiStateActions.setDialog('KEYBOARD_SHORTCUTS');
        }
        e.preventDefault();
        return;
      }

      // I → toggle selection dimming (FEA12-01). Works in all modes
      // including read-only — the toggle is always visible via the `?`
      // dialog regardless of mode.
      if (!hasModifier && (e.key === 'i' || e.key === 'I')) {
        uiStateActions.toggleSelectionDimEnabled();
        e.preventDefault();
        return;
      }

      // Remaining shortcuts only fire in editable mode.
      if (!isEditable) return;

      // === Undo / redo (FEA5-03) ===
      // Standard cross-platform conventions:
      //   Ctrl/Cmd+Z         → undo
      //   Ctrl/Cmd+Shift+Z   → redo (Mac convention)
      //   Ctrl+Y             → redo (Windows convention)
      if (hasModifier && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return;
      }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        redo();
        e.preventDefault();
        return;
      }

      const selected =
        itemControls && itemControls.type !== 'ADD_ITEM' ? itemControls : null;

      // === Selection-dependent shortcuts ===
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
        return;
      }

      // === Duplicate (Ctrl/Cmd+D) ===
      // Ctrl+D in browsers opens the bookmark dialog — preventDefault
      // is essential. Skips connectors (matches the existing
      // duplicateItem semantics; see useScene.ts:280).
      if (hasModifier && (e.key === 'd' || e.key === 'D')) {
        if (selected) {
          duplicateItem(selected);
          e.preventDefault();
        }
        return;
      }

      // === Copy / paste (Ctrl/Cmd+C / Ctrl/Cmd+V) (FEA5-04) ===
      // Copy silently no-ops if nothing is selected; paste no-ops if
      // the clipboard is empty. preventDefault is essential — the
      // browser's native Ctrl+C would otherwise copy the surrounding
      // page text into the OS clipboard, which is not what the user
      // wants while editing the canvas.
      if (hasModifier && (e.key === 'c' || e.key === 'C')) {
        if (selected) {
          copySelection(selected);
          e.preventDefault();
        }
        return;
      }
      if (hasModifier && (e.key === 'v' || e.key === 'V')) {
        const pasted = paste();
        if (pasted) {
          uiStateActions.setItemControls(pasted);
          e.preventDefault();
        }
        return;
      }

      // === Tool switches (bare letter, no modifier) ===
      // V or S → Select. Anything held with Ctrl/Cmd is left for the
      // browser / other handlers (e.g. Ctrl+S = browser save, not
      // ours to steal; Ctrl+V = future paste).
      if (hasModifier) return;

      if (e.key === 'v' || e.key === 'V' || e.key === 's' || e.key === 'S') {
        selectTool();
        e.preventDefault();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        handTool();
        e.preventDefault();
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        addItemTool();
        e.preventDefault();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        rectangleTool();
        e.preventDefault();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        connectorTool();
        e.preventDefault();
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        textTool();
        e.preventDefault();
      }
    };

    // FEA10-01-style scoping: window (default) keeps the historic global
    // behaviour; the renderer element confines shortcuts to canvas focus.
    // When scoped, the target is null until `rendererEl` is set, at which
    // point the effect re-runs and binds.
    const target: Window | HTMLElement | null = enableGlobalKeyboardShortcuts
      ? window
      : rendererEl;
    if (!target) return undefined;

    target.addEventListener('keydown', onKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', onKeyDown as EventListener);
    };
  }, [
    enableGlobalKeyboardShortcuts,
    rendererEl,
    editorMode,
    itemControls,
    dialog,
    uiStateActions,
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    updateViewItem,
    updateTextBox,
    updateRectangle,
    duplicateItem,
    createTextBox,
    copySelection,
    paste,
    undo,
    redo,
    fitToView,
    currentView
  ]);
};
