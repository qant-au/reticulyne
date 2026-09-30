import { createStore } from 'zustand';
import {
  CoordsUtils,
  incrementZoom,
  decrementZoom,
  getStartingMode
} from 'src/utils';
import { UiStateStore } from 'src/types';
import { INITIAL_UI_STATE } from 'src/config';
import { TEMPLATES } from 'src/templates';
import { freshSceneContext } from 'src/scene/convert';
import { createContextualStore } from './createContextualStore';

const { Provider, useStore } = createContextualStore<UiStateStore>(() => {
  return createStore<UiStateStore>((set, get) => {
    return {
      zoom: INITIAL_UI_STATE.zoom,
      zoomAnchor: null,
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
      clipboard: [],
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
      exportBackgroundColor: undefined,
      titleBarRaised: false,
      showTitleBar: undefined,
      showAlignmentGuides: true,
      searchOpen: false,
      iconPaletteOpen: false,
      showMiniMap: undefined,
      searchMatches: [],
      onNodeClick: undefined,
      onConnectorClick: undefined,
      patchQueue: [],
      onSave: undefined,
      onIconUpload: undefined,
      onDiagramReplaced: undefined,
      loadGeneration: 0,
      sceneContext: freshSceneContext(),
      focusTextBoxId: null,
      announcement: { text: '', seq: 0 },
      templates: TEMPLATES,
      editingGroupId: null,
      hideRedacted: false,
      showOtherFloors: true,
      saveStatus: {
        state: 'idle',
        isDirty: false,
        lastSavedAt: null,
        savedFingerprint: null,
        error: null
      },
      onValidationError: undefined,
      nodeIndicatorComponent: undefined,
      connectorIndicatorComponent: undefined,
      selectionDimEnabled: false,
      highlightedItemId: undefined,
      tour: null,
      tourSteps: undefined,
      onTourStepChange: undefined,
      actions: {
        setView: (view) => {
          // Groups are per view, so the one being edited is left behind.
          set({ view, editingGroupId: null });
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
            editingGroupId: null,
            zoom: 1,
            zoomAnchor: null
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
        // A step keeps the level the zoom was last SET to on the ladder,
        // so zoom out retraces zoom in from Fit's level exactly.
        incrementZoom: () => {
          const { zoom, zoomAnchor } = get();
          set({ zoom: incrementZoom(zoom, zoomAnchor ?? zoom) });
        },
        decrementZoom: () => {
          const { zoom, zoomAnchor } = get();
          set({ zoom: decrementZoom(zoom, zoomAnchor ?? zoom) });
        },
        setZoom: (zoom) => {
          set({ zoom, zoomAnchor: zoom });
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
        setClipboard: (entries) => {
          set({ clipboard: entries });
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
        setExportBackgroundColor: (color) => {
          set({ exportBackgroundColor: color });
        },
        setTitleBarRaised: (titleBarRaised) => {
          if (get().titleBarRaised !== titleBarRaised) set({ titleBarRaised });
        },
        setShowAlignmentGuides: (showAlignmentGuides) => {
          set({ showAlignmentGuides });
        },
        setSearchOpen: (searchOpen) => {
          set({ searchOpen });
        },
        setIconPaletteOpen: (iconPaletteOpen) => {
          set({ iconPaletteOpen });
        },
        setShowMiniMap: (showMiniMap) => {
          set({ showMiniMap });
        },
        setSearchMatches: (searchMatches) => {
          set({ searchMatches });
        },
        setClickHandlers: ({ onNodeClick, onConnectorClick }) => {
          set({ onNodeClick, onConnectorClick });
        },
        enqueuePatch: (entry) => {
          set({ patchQueue: [...get().patchQueue, entry] });
        },
        takePatches: () => {
          const queued = get().patchQueue;
          if (queued.length > 0) set({ patchQueue: [] });
          return queued;
        },
        setShowTitleBar: (showTitleBar) => {
          set({ showTitleBar });
        },
        setEditingGroupId: (editingGroupId) => {
          set({ editingGroupId });
        },
        setHideRedacted: (hideRedacted) => {
          set({ hideRedacted });
        },
        setShowOtherFloors: (showOtherFloors) => {
          set({ showOtherFloors });
        },
        setTemplates: (templates) => {
          set({ templates });
        },
        setOnIconUpload: (onIconUpload) => {
          set({ onIconUpload });
        },
        setOnDiagramReplaced: (onDiagramReplaced) => {
          set({ onDiagramReplaced });
        },
        announce: (text) => {
          set({ announcement: { text, seq: get().announcement.seq + 1 } });
        },
        setFocusTextBoxId: (focusTextBoxId) => {
          set({ focusTextBoxId });
        },
        markLoaded: () => {
          set({ loadGeneration: get().loadGeneration + 1 });
        },
        setSceneContext: (sceneContext) => {
          set({ sceneContext });
        },
        setOnSave: (onSave) => {
          set({ onSave });
        },
        setSaveStatus: (patch) => {
          set({ saveStatus: { ...get().saveStatus, ...patch } });
        },
        getSaveStatus: () => {
          return get().saveStatus;
        },
        get: () => {
          return get();
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
        setTour: (tour) => {
          set({ tour });
        },
        setTourSteps: (tourSteps) => {
          set({ tourSteps });
        },
        setOnTourStepChange: (onTourStepChange) => {
          set({ onTourStepChange });
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
