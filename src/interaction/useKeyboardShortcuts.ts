import { useEffect, useRef } from 'react';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import {
  getItemByIdOrThrow,
  generateId,
  connectorsFirst,
  isLocked,
  collapsedBoxes,
  collapsedGroupMembers
} from 'src/utils';
import { TEXTBOX_DEFAULTS } from 'src/config';
import { useThemeToggle } from 'src/hooks/useThemeToggle';
import { useTour } from 'src/hooks/useTour';
import { tourKeyAction } from './tourKeys';
import type { ItemReference } from 'src/types';
import {
  isTypingTarget,
  keymapFor,
  resolveAction
} from 'src/vendor/accurona-core';

const NUDGE_STEP = 1;
const SHIFT_MULTIPLIER = 5;

// Reticulyne's bindings from the shared keymap. Rows the spec marks "where
// built" that Reticulyne has not built stay unbound: Q (keep tool), align,
// and Ctrl/Cmd+Enter (there is no point-editing mode for connectors). Lock
// is bound since lw-069.
export const KEYMAP = keymapFor('reticulyne', {
  omit: [
    'keep-tool',
    'edit-geometry',
    'align-left',
    'align-right',
    'align-top',
    'align-bottom'
  ]
});

const LAYER_ORDER = {
  'bring-forward': 'BRING_FORWARD',
  'send-backward': 'SEND_BACKWARD',
  'bring-to-front': 'BRING_TO_FRONT',
  'send-to-back': 'SEND_TO_BACK'
} as const;

// FEA5-02: keyboard shortcuts. Since lw-048 the bindings are the shared
// keymap in @accurona/core (docs/keymap.md in Accurona), which Axonometra
// binds too; this hook maps each action to what it does here.
//
// Editing bindings fire only in EDITABLE mode; selecting, panning, zoom,
// fit, find, the theme toggle and ? fire read-only too, as the spec rules.
//
// Tool letters intentionally double up on Ctrl/Cmd-chord variants
// (Ctrl+C copy, Ctrl+V paste, Ctrl+D duplicate). We dispatch the
// chord handler only when the modifier is held, and the bare letter
// only when it's NOT held — so the conventions don't collide.
//
// UXA-01 realigned the tool layer onto Excalidraw's, because an operator
// moving between an Excalidraw canvas and the isometric one should
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
  const editingGroupId = useUiStateStore((state) => {
    return state.editingGroupId;
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
    updateConnector,
    duplicateSelection,
    changeLayerOrder,
    createTextBox,
    copySelection,
    paste,
    groupSelection,
    ungroupSelection,
    setItemsLocked,
    undo,
    redo,
    currentView,
    visibleView,
    showAdjacentFloor
  } = useScene();
  const { fitToView, fitToSelection } = useDiagramUtils();
  const toggleTheme = useThemeToggle();
  const tour = useTour();

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
      // (Quill descriptions, MUI TextFields, open menus).
      if (isTypingTarget(e.target)) return;

      // With a dialog open the canvas is behind it: only ? (to toggle the
      // shortcuts dialog) gets through. Without this, H switched tool and
      // - zoomed behind the open shortcuts dialog.
      if (dialog !== null && e.key !== '?') return;
      // Likewise the main menu, whether or not it holds focus; Esc
      // closes it.
      if (uiStateActions.get().isMainMenuOpen) {
        if (e.key === 'Escape') uiStateActions.setIsMainMenuOpen(false);
        return;
      }

      // lw-064: while a tour runs, its keys come first: the arrows step it
      // instead of nudging. Not in NON_INTERACTIVE, where the host drives.
      const { tour: runningTour } = uiStateActions.get();
      if (runningTour && editorMode !== 'NON_INTERACTIVE') {
        const tourAction = tourKeyAction(e);
        if (tourAction !== null) {
          if (tourAction === 'next') tour.next();
          else if (tourAction === 'previous') tour.previous();
          else if (tourAction === 'first') tour.goTo(0);
          else if (tourAction === 'last')
            tour.goTo(runningTour.steps.length - 1);
          else tour.end();
          e.preventDefault();
          return;
        }
      }

      // The shared keymap (@accurona/core) decides which action a key is;
      // read-only drops every editing binding.
      const action = resolveAction(e, KEYMAP, {
        readOnly: !isEditable,
        typingGuard: false
      });
      if (action === null) return;

      const done = () => {
        e.preventDefault();
      };

      switch (action) {
        // Escape: deselect. Allowed in every editor mode — read-only
        // diagrams may still surface a selection-driven detail panel.
        case 'escape': {
          // An icon armed for placement is put down again.
          const { mode, iconPaletteOpen } = uiStateActions.get();
          // The icon library closes on Esc, as the other panels do.
          if (iconPaletteOpen && !(mode.type === 'PLACE_ICON' && mode.id)) {
            uiStateActions.setIconPaletteOpen(false);
            done();
          }
          if (mode.type === 'PLACE_ICON' && mode.id) {
            uiStateActions.setMode({ ...mode, id: null });
            done();
          } else if (mode.type === 'PLACE_ICON') {
            // Nothing armed: Esc leaves the Add item tool (it closed the
            // picker but left the tool pressed).
            selectTool();
            done();
          }
          // A connector being dragged out is abandoned: releasing it on a
          // node afterwards used to create it anyway.
          if (mode.type === 'CONNECTOR' && mode.id) {
            deleteConnector(mode.id);
            uiStateActions.setMode({
              type: 'CONNECTOR',
              id: null,
              showCursor: true
            });
            done();
          }
          if (itemControls || selection.length > 0) {
            uiStateActions.clearSelection();
            done();
          }
          // 1.7: and leave the group being edited.
          if (editingGroupId) {
            uiStateActions.setEditingGroupId(null);
            done();
          }
          return;
        }

        // 2.7: Ctrl/Cmd+F opens the find bar, in any editor mode. Taken from
        // the browser deliberately, as Excalidraw does: page find cannot see
        // text drawn on the canvas.
        case 'find':
          uiStateActions.setSearchOpen(true);
          done();
          return;

        // UXA-08: Alt+Shift+D flips light <-> dark, in any editor mode (it
        // changes how the diagram looks, not the diagram).
        case 'toggle-theme':
          toggleTheme();
          done();
          return;

        // Zoom + fit work in EDITABLE and EXPLORABLE_READONLY. Chording
        // steals the browser's page zoom, which is the trade Excalidraw
        // itself makes — inside a canvas editor the diagram is what you want
        // to zoom.
        case 'zoom-in':
          uiStateActions.incrementZoom();
          done();
          return;
        case 'zoom-out':
          uiStateActions.decrementZoom();
          done();
          return;
        case 'zoom-reset':
          uiStateActions.setZoom(1);
          done();
          return;
        case 'fit-all':
          fitToView();
          done();
          return;
        case 'fit-selection':
          fitToSelection(selection);
          done();
          return;

        case 'help':
          uiStateActions.setDialog(
            dialog === 'KEYBOARD_SHORTCUTS' ? null : 'KEYBOARD_SHORTCUTS'
          );
          done();
          return;

        // lw-053: Alt+Up / Alt+Down show the floor above or below.
        // Navigation, so read-only too, but not in a NON_INTERACTIVE render.
        case 'floor-up':
        case 'floor-down':
          if (editorMode === 'NON_INTERACTIVE') return;
          showAdjacentFloor(action === 'floor-up' ? 1 : -1);
          done();
          return;

        // Alt+I → toggle selection dimming (FEA12-01), a display toggle, so
        // it works read-only too.
        case 'toggle-highlight':
          uiStateActions.toggleSelectionDimEnabled();
          done();
          return;

        // Selecting and panning are not editing: they work read-only, but
        // not in a NON_INTERACTIVE render, which has no pointer at all.
        case 'select':
          if (editorMode === 'NON_INTERACTIVE') return;
          selectTool();
          done();
          return;
        case 'hand':
          if (editorMode === 'NON_INTERACTIVE') return;
          handTool();
          done();
          return;

        // === Undo / redo (FEA5-03) ===
        case 'undo':
          undo();
          done();
          return;
        case 'redo':
          redo();
          done();
          return;

        // === Select all — UXA-07 ===
        // Connector anchors are excluded for the same reason the marquee
        // excludes them: they are sub-parts, not top-level items. Selecting
        // is editing here: the selection drives the edit panels. What a
        // hidden layer holds is not selected (lw-052), nor anything locked
        // (lw-069).
        case 'select-all': {
          if (!isEditable) return;
          const open = (entry: { locked?: boolean }) => {
            return !entry.locked;
          };
          const all: ItemReference[] = [
            ...(visibleView.items ?? []).filter(open).map((i) => {
              return { type: 'ITEM' as const, id: i.id };
            }),
            ...(visibleView.textBoxes ?? []).filter(open).map((t) => {
              return { type: 'TEXTBOX' as const, id: t.id };
            }),
            ...(visibleView.connectors ?? []).filter(open).map((c) => {
              return { type: 'CONNECTOR' as const, id: c.id };
            }),
            ...(visibleView.rectangles ?? []).filter(open).map((r) => {
              return { type: 'RECTANGLE' as const, id: r.id };
            }),
            // lw-062: and what the collapsed groups stand for.
            ...collapsedBoxes(visibleView).flatMap((box) => {
              return collapsedGroupMembers(currentView, box.groupId);
            })
          ];
          uiStateActions.setSelection(all);
          done();
          return;
        }

        // === Selection-dependent shortcuts ===
        // Every one of these operates on the whole `selection` array, which
        // is a one-element array in the ordinary single-select case.
        case 'delete':
          if (selection.length === 0) return;
          // Clear first — the outline renderers look selected ids up in the
          // scene, and would throw on a reference to a just-deleted item.
          uiStateActions.clearSelection();
          connectorsFirst(selection).forEach(deleteSelected);
          done();
          return;

        // Enter opens the selected object for editing: a text box's text
        // takes focus, anything else opens its panel with the first field
        // focused, so the keyboard reaches what a double-click would.
        case 'edit': {
          const target =
            selection.length === 1
              ? selection[0]
              : itemControls && itemControls.type !== 'ADD_ITEM'
                ? itemControls
                : null;
          if (
            !target ||
            target.type === 'CONNECTOR_ANCHOR' ||
            (selection.length > 1 && !itemControls)
          ) {
            return;
          }
          uiStateActions.setItemControls(target);
          if (target.type === 'TEXTBOX') {
            uiStateActions.setFocusTextBoxId(target.id);
          } else {
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(
                  '[data-item-controls] input:not([type="hidden"]), [data-item-controls] textarea, [data-item-controls] [contenteditable="true"]'
                )
                ?.focus();
            });
          }
          done();
          return;
        }

        case 'nudge': {
          if (selection.length === 0) return;
          const step = NUDGE_STEP * (e.shiftKey ? SHIFT_MULTIPLIER : 1);
          let dx = 0;
          let dy = 0;
          // Tile +y draws up-left and +x up-right (getTilePosition), so Up
          // is +y: with -y, ArrowUp moved a node down the screen.
          switch (e.key) {
            case 'ArrowUp':
              dy = step;
              break;
            case 'ArrowDown':
              dy = -step;
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
          // A nudge that would put a node on a tile another node holds is
          // refused, as Align does: it stacked them, hiding the one below.
          const moving = new Set(
            selection
              .filter((s) => {
                return s.type === 'ITEM';
              })
              .map((s) => {
                return s.id;
              })
          );
          const taken = new Set(
            (currentView.items ?? [])
              .filter((i) => {
                return !moving.has(i.id);
              })
              .map((i) => {
                return `${i.tile.x},${i.tile.y}`;
              })
          );
          const blocked = (currentView.items ?? []).some((i) => {
            return (
              moving.has(i.id) && taken.has(`${i.tile.x + dx},${i.tile.y + dy}`)
            );
          });
          if (blocked) {
            done();
            return;
          }
          // Same delta applied to every member, so a nudged group keeps its
          // internal spacing instead of drifting apart.
          selection.forEach((item) => {
            nudgeSelected(dx, dy, item);
          });
          // A connector whose node ends all moved takes its waypoints along,
          // as a drag does.
          if (moving.size >= 2) {
            (currentView.connectors ?? []).forEach((c) => {
              const ends = c.anchors.filter((a) => {
                return a.ref.item !== undefined;
              });
              const hasWaypoint = c.anchors.some((a) => {
                return a.ref.tile !== undefined;
              });
              if (
                !hasWaypoint ||
                ends.length < 2 ||
                !ends.every((a) => {
                  return moving.has(a.ref.item!);
                })
              ) {
                return;
              }
              updateConnector(c.id, {
                anchors: c.anchors.map((a) => {
                  return a.ref.tile
                    ? {
                        ...a,
                        ref: {
                          tile: { x: a.ref.tile.x + dx, y: a.ref.tile.y + dy }
                        }
                      }
                    : a;
                })
              });
            });
          }
          done();
          return;
        }

        case 'group':
          groupSelection(selection);
          done();
          return;
        case 'ungroup':
          ungroupSelection(selection);
          done();
          return;

        // === Lock (lw-069, Excalidraw's Ctrl/Cmd+Shift+L) ===
        // Locks the selection, or unlocks it when all of it is locked.
        // As in Excalidraw, locking deselects: a locked item cannot be
        // selected on the canvas, and is unlocked from its context menu.
        case 'lock': {
          const lockable = selection.filter((ref) => {
            return ref.type !== 'CONNECTOR_ANCHOR';
          });
          if (lockable.length === 0) return;
          const allLocked = lockable.every((ref) => {
            return isLocked(currentView, ref);
          });
          setItemsLocked(lockable, !allLocked);
          if (!allLocked) {
            uiStateActions.setSelection([]);
            uiStateActions.setItemControls(null);
          }
          done();
          return;
        }

        // === Duplicate (Ctrl/Cmd+D) ===
        // Ctrl+D in browsers opens the bookmark dialog — preventDefault
        // is essential. As in Excalidraw it copies the whole selection
        // (connectors skipped) and selects the copies, so a second press
        // steps on from them.
        case 'duplicate': {
          const copies = duplicateSelection(selection);
          if (copies.length > 0) {
            uiStateActions.setSelection(copies);
            done();
          }
          return;
        }

        // === Layer order (UXA-06) ===
        // Acts on the whole selection as one block; nodes are depth-sorted
        // and are left out.
        case 'bring-forward':
        case 'send-backward':
        case 'bring-to-front':
        case 'send-to-back': {
          const orderable = selection.filter((item) => {
            return (
              item.type === 'RECTANGLE' ||
              item.type === 'CONNECTOR' ||
              item.type === 'TEXTBOX'
            );
          });
          if (orderable.length === 0) return;
          changeLayerOrder(LAYER_ORDER[action], orderable);
          done();
          return;
        }

        // === Copy / cut / paste (FEA5-04, UXA-04) ===
        // All three act on the whole selection. Connectors are not copyable
        // (their anchors point at other items), so a cut removes only what
        // it copied and leaves selected connectors alone. A paste selects
        // everything it created.
        case 'cut': {
          const copyable = selection.filter((item) => {
            return (
              item.type !== 'CONNECTOR' && item.type !== 'CONNECTOR_ANCHOR'
            );
          });
          if (copyable.length > 0) {
            copySelection(copyable);
            uiStateActions.clearSelection();
            copyable.forEach(deleteSelected);
            done();
          }
          return;
        }
        case 'copy':
          if (selection.length > 0 && copySelection(selection) > 0) {
            done();
          }
          return;
        case 'paste': {
          const pasted = paste();
          if (pasted && pasted.length > 0) {
            uiStateActions.setSelection(pasted);
            done();
          }
          return;
        }

        // === Tools (UXA-01: Excalidraw's letters and number row) ===
        case 'add-item':
          addItemTool();
          done();
          return;
        case 'rectangle':
          rectangleTool();
          done();
          return;
        case 'connector':
          connectorTool();
          done();
          return;
        case 'text':
          textTool();
          done();
          return;
        default:
          return;
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
    editingGroupId,
    groupSelection,
    ungroupSelection,
    setItemsLocked,
    dialog,
    uiStateActions,
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    updateViewItem,
    updateTextBox,
    updateRectangle,
    updateConnector,
    duplicateSelection,
    changeLayerOrder,
    createTextBox,
    copySelection,
    paste,
    undo,
    redo,
    fitToView,
    fitToSelection,
    currentView,
    visibleView,
    showAdjacentFloor,
    toggleTheme,
    tour
  ]);
};
