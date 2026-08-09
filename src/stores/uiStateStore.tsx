import { createStore } from 'zustand';
import {
  CoordsUtils,
  incrementZoom,
  decrementZoom,
  getStartingMode
} from 'src/utils';
import { UiStateStore } from 'src/types';
import { INITIAL_UI_STATE } from 'src/config';
import { createContextualStore } from './createContextualStore';

const { Provider, useStore } = createContextualStore<UiStateStore>(() => {
  return createStore<UiStateStore>((set, get) => {
    return {
      zoom: INITIAL_UI_STATE.zoom,
      scroll: INITIAL_UI_STATE.scroll,
      view: '',
      mainMenuOptions: [],
      editorMode: 'EXPLORABLE_READONLY',
      mode: getStartingMode('EXPLORABLE_READONLY'),
      iconCategoriesState: [],
      isMainMenuOpen: false,
      dialog: null,
      rendererEl: null,
      contextMenu: null,
      clipboard: null,
      mouse: {
        position: { screen: CoordsUtils.zero(), tile: CoordsUtils.zero() },
        mousedown: null,
        delta: null
      },
      itemControls: null,
      selection: [],
      enableDebugTools: false,
      enableAnimation: false,
      exportTheme: 'light' as const,
      showTitleBar: undefined,
      onSave: undefined,
      onValidationError: undefined,
      nodeIndicatorComponent: undefined,
      connectorIndicatorComponent: undefined,
      selectionDimEnabled: false,
      highlightedItemId: undefined,
      actions: {
        setView: (view) => {
          set({ view });
        },
        setMainMenuOptions: (mainMenuOptions) => {
          set({ mainMenuOptions });
        },
        setEditorMode: (mode) => {
          set({ editorMode: mode, mode: getStartingMode(mode) });
        },
        setIconCategoriesState: (iconCategoriesState) => {
          set({ iconCategoriesState });
        },
        resetUiState: () => {
          set({
            mode: getStartingMode(get().editorMode),
            scroll: {
              position: CoordsUtils.zero(),
              offset: CoordsUtils.zero()
            },
            itemControls: null,
            selection: [],
            zoom: 1
          });
        },
        setMode: (mode) => {
          set({ mode });
        },
        setDialog: (dialog) => {
          set({ dialog });
        },
        setIsMainMenuOpen: (isMainMenuOpen) => {
          set({ isMainMenuOpen, itemControls: null, selection: [] });
        },
        incrementZoom: () => {
          const { zoom } = get();
          set({ zoom: incrementZoom(zoom) });
        },
        decrementZoom: () => {
          const { zoom } = get();
          set({ zoom: decrementZoom(zoom) });
        },
        setZoom: (zoom) => {
          set({ zoom });
        },
        setScroll: ({ position, offset }) => {
          set({ scroll: { position, offset: offset ?? get().scroll.offset } });
        },
        // Wheel/trackpad pan path (FEA5-01). Reads the current scroll
        // via get() so the wheel handler (whose closure may be stale)
        // can apply a relative delta without race-condition risk.
        // FEA5-04: clipboard slice. Lives in uiState (not model)
        // because the clipboard is host-session state — copied
        // selections survive across model loads / undo / redo but
        // not across page refreshes, and they're never persisted.
        setClipboard: (entry) => {
          set({ clipboard: entry });
        },
        panScroll: (delta) => {
          const { scroll } = get();
          set({
            scroll: {
              position: {
                x: scroll.position.x + delta.x,
                y: scroll.position.y + delta.y
              },
              offset: scroll.offset
            }
          });
        },
        // 1.4: `itemControls` and `selection` are written as a pair, always,
        // so the invariant documented on `Selection` cannot drift. Callers
        // that only ever meant single-select keep calling setItemControls
        // and get a one-element (or empty) selection for free.
        setItemControls: (itemControls) => {
          const selection =
            itemControls && itemControls.type !== 'ADD_ITEM'
              ? [itemControls]
              : [];
          set({ itemControls, selection });
        },
        setSelection: (selection) => {
          set({
            selection,
            // The inspector follows the most recently added member — that is
            // the one the user just clicked or the last the marquee swept up.
            itemControls:
              selection.length > 0 ? selection[selection.length - 1] : null
          });
        },
        toggleSelected: (item) => {
          const { selection } = get();
          const without = selection.filter((s) => {
            return !(s.type === item.type && s.id === item.id);
          });
          // Present -> remove it. Absent -> append, so it becomes the
          // inspector target.
          const next =
            without.length === selection.length
              ? [...selection, item]
              : without;
          set({
            selection: next,
            itemControls: next.length > 0 ? next[next.length - 1] : null
          });
        },
        clearSelection: () => {
          set({ selection: [], itemControls: null });
        },
        setContextMenu: (contextMenu) => {
          set({ contextMenu });
        },
        setMouse: (mouse) => {
          set({ mouse });
        },
        setEnableDebugTools: (enableDebugTools) => {
          set({ enableDebugTools });
        },
        setEnableAnimation: (enableAnimation) => {
          set({ enableAnimation });
        },
        setExportTheme: (mode) => {
          set({ exportTheme: mode });
        },
        setShowTitleBar: (showTitleBar) => {
          set({ showTitleBar });
        },
        setOnSave: (onSave) => {
          set({ onSave });
        },
        setOnValidationError: (onValidationError) => {
          set({ onValidationError });
        },
        setNodeIndicatorComponent: (component) => {
          set({ nodeIndicatorComponent: component });
        },
        setConnectorIndicatorComponent: (component) => {
          set({ connectorIndicatorComponent: component });
        },
        setSelectionDimEnabled: (selectionDimEnabled) => {
          set({ selectionDimEnabled });
        },
        toggleSelectionDimEnabled: () => {
          set({ selectionDimEnabled: !get().selectionDimEnabled });
        },
        setHighlightedItemId: (highlightedItemId) => {
          set({ highlightedItemId });
        },
        setRendererEl: (el) => {
          set({ rendererEl: el });
        }
      }
    };
  });
}, 'UiState');

export const UiStateProvider = Provider;
export const useUiStateStore = useStore;
