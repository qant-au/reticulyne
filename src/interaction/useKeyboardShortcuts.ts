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
// Single-letter tool switches plus zoom hotkeys. Tool switches and
// duplicate fire only in EDITABLE mode; zoom + fit-to-view fire in any
// mode that allows zooming (EDITABLE and EXPLORABLE_READONLY).
//
// Tool letters intentionally double up on Ctrl/Cmd-chord variants
// (Ctrl+C copy, Ctrl+V paste, Ctrl+D duplicate). We dispatch the
// chord handler only when the modifier is held, and the bare letter
// only when it's NOT held — so the conventions don't collide.
//
// UXA-01 realigned the tool layer onto Excalidraw's, because an operator
// moving between Drafts' Excalidraw canvas and the isometric one should
// not have to retrain. The changes, and why each was safe:
//
//   A  → Connector, not Add-item. Excalidraw's A is arrow, and a
//        connector IS this editor's arrow.
//   I  → Add-item, taking A's old job. Excalidraw's I is the
//        eye-dropper, which has no isometric equivalent, and "I = Icon"
//        is a better mnemonic than the letter it replaced. This
//        supersedes I's old selection-dimming toggle, which moves to
//        Alt+I (see below) — a rarely-used Reticulyne-only feature
//        should not squat on a key Excalidraw owns.
//   1/2/5/8/9 → Select / Rectangle / Connector / Text / Add-item, the
//        number row Excalidraw binds. Bare 0 and 1 no longer reset zoom;
//        1 is Select and 0 is left unbound (Excalidraw's eraser).
//   Ctrl/Cmd+0 → Reset zoom, the Excalidraw binding, replacing bare 0/1.
//   Ctrl/Cmd+= / Ctrl/Cmd+- → zoom aliases beside the existing bare keys.
//   Shift+1 → Fit to view, alias of F.
//   Shift+2 → Fit to selection (new; needs the 1.4 selection model).
//   Ctrl/Cmd+A → Select all.
//   Ctrl/Cmd+X → Cut.
//
// Excalidraw's D / O / L / P / E (diamond, ellipse, line, freedraw,
// eraser) stay deliberately unbound: they are free-form vector tools with
// no meaning on a tile-based isometric grid. Ctrl/Cmd+D remains duplicate,
// which Excalidraw also binds.
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
  const selection = useUiStateStore((state) => {
    return state.selection;
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
  const { fitToView, fitToSelection } = useDiagramUtils();

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
        if (itemControls || selection.length > 0) {
          uiStateActions.clearSelection();
          e.preventDefault();
        }
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey;

      // === Zoom + fit-to-view (work in EDITABLE and EXPLORABLE_READONLY) ===
      // UXA-01: both the bare keys (kept, they were here first and cost
      // nothing) and Excalidraw's Ctrl/Cmd-chord forms. Chording steals the
      // browser's page zoom, which is the trade Excalidraw itself makes —
      // inside a canvas editor the diagram is what you want to zoom.
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
      // Reset zoom is now Ctrl/Cmd+0 only. Bare 0 is left unbound and bare
      // 1 becomes the Select tool below — both belong to Excalidraw's tool
      // row, and keeping them on zoom was the single worst collision.
      if (hasModifier && e.key === '0') {
        uiStateActions.setZoom(1);
        e.preventDefault();
        return;
      }
      if (!hasModifier && (e.key === 'f' || e.key === 'F')) {
        fitToView();
        e.preventDefault();
        return;
      }
      // Shift+1 fit-to-view / Shift+2 fit-to-selection (Excalidraw match).
      // Read off `e.code` rather than `e.key`, because Shift+1 arrives as
      // '!' on a US layout and as something else again elsewhere.
      if (e.shiftKey && !hasModifier && e.code === 'Digit1') {
        fitToView();
        e.preventDefault();
        return;
      }
      if (e.shiftKey && !hasModifier && e.code === 'Digit2') {
        fitToSelection(selection);
        e.preventDefault();
        return;
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

      // Alt+I → toggle selection dimming (FEA12-01). Moved off bare I by
      // UXA-01, which needs I for Add-item to mirror Excalidraw. Alt is
      // otherwise unbound in Reticulyne, and dimming is a display toggle
      // rather than a tool, so a chord is the right home for it. Works in
      // all modes including read-only.
      // Matched on `e.code`: macOS turns Option+I into a dead-key combining
      // circumflex, so `e.key` is not 'i' there.
      if (e.altKey && !hasModifier && e.code === 'KeyI') {
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

      // === Select all (Ctrl/Cmd+A) — UXA-07, unlocked by 1.4 ===
      // Connector anchors are excluded for the same reason the marquee
      // excludes them: they are sub-parts, not top-level items.
      if (hasModifier && (e.key === 'a' || e.key === 'A')) {
        const all: ItemReference[] = [
          ...(currentView.items ?? []).map((i) => {
            return { type: 'ITEM' as const, id: i.id };
          }),
          ...(currentView.textBoxes ?? []).map((t) => {
            return { type: 'TEXTBOX' as const, id: t.id };
          }),
          ...(currentView.connectors ?? []).map((c) => {
            return { type: 'CONNECTOR' as const, id: c.id };
          }),
          ...(currentView.rectangles ?? []).map((r) => {
            return { type: 'RECTANGLE' as const, id: r.id };
          })
        ];
        uiStateActions.setSelection(all);
        e.preventDefault();
        return;
      }

      // === Selection-dependent shortcuts ===
      // Every one of these operates on the whole `selection` array, which
      // is a one-element array in the ordinary single-select case.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.length === 0) return;
        // Clear first — the outline renderers look selected ids up in the
        // scene, and would throw on a reference to a just-deleted item.
        uiStateActions.clearSelection();
        selection.forEach(deleteSelected);
        e.preventDefault();
        return;
      }

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (selection.length === 0) return;
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
        // Same delta applied to every member, so a nudged group keeps its
        // internal spacing instead of drifting apart.
        selection.forEach((item) => {
          nudgeSelected(dx, dy, item);
        });
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

      // === Copy / cut / paste (Ctrl/Cmd+C / X / V) (FEA5-04, UXA-04) ===
      // Copy silently no-ops if nothing is selected; paste no-ops if
      // the clipboard is empty. preventDefault is essential — the
      // browser's native Ctrl+C would otherwise copy the surrounding
      // page text into the OS clipboard, which is not what the user
      // wants while editing the canvas.
      //
      // These three stay SINGLE-item even with a multi-selection: the
      // clipboard slice holds one ClipboardEntry by construction
      // (FEA5-04), so they act on the inspector target — the last item
      // added to the selection. Widening the clipboard to a list is its
      // own piece of work, tracked separately; silently copying only one
      // of five selected items with no signal would be worse, so the `?`
      // dialog labels these as acting on the active item.
      if (hasModifier && (e.key === 'x' || e.key === 'X')) {
        if (selected) {
          copySelection(selected);
          uiStateActions.clearSelection();
          deleteSelected(selected);
          e.preventDefault();
        }
        return;
      }
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

      // === Tool switches (bare key, no modifier) ===
      // Anything held with Ctrl/Cmd is left for the browser / the chord
      // handlers above (e.g. Ctrl+S = browser save, not ours to steal).
      // Shift is excluded too, so Shift+1 / Shift+2 reach the fit handlers
      // rather than being swallowed here as the Select tool.
      if (hasModifier || e.shiftKey) return;

      // UXA-01 binding table. Each tool takes its Excalidraw letter and
      // its Excalidraw number; `e.code` is used for the digits so the
      // binding survives non-US layouts where the top row is punctuation.
      const isKey = (letters: string[], digit?: string) => {
        if (digit !== undefined && e.code === digit) return true;
        return letters.includes(e.key.toLowerCase());
      };

      if (isKey(['v', 's'], 'Digit1')) {
        selectTool();
        e.preventDefault();
        return;
      }
      if (isKey(['h'])) {
        handTool();
        e.preventDefault();
        return;
      }
      // I / 9 → Add item. Was bare A until UXA-01; A is Excalidraw's arrow.
      if (isKey(['i'], 'Digit9')) {
        addItemTool();
        e.preventDefault();
        return;
      }
      if (isKey(['r'], 'Digit2')) {
        rectangleTool();
        e.preventDefault();
        return;
      }
      // A / C / 5 → Connector. A is the Excalidraw arrow key; C is kept as
      // the long-standing Reticulyne binding so existing muscle memory in
      // the other direction is not broken either.
      if (isKey(['a', 'c'], 'Digit5')) {
        connectorTool();
        e.preventDefault();
        return;
      }
      if (isKey(['t'], 'Digit8')) {
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
    selection,
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
    fitToSelection,
    currentView
  ]);
};
