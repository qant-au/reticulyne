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
      mouse: {
        position: { screen: CoordsUtils.zero(), tile: CoordsUtils.zero() },
        mousedown: null,
        delta: null
      },
      itemControls: null,
      enableDebugTools: false,
      showTitleBar: undefined,
      onSave: undefined,
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
          set({ isMainMenuOpen, itemControls: null });
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
        setItemControls: (itemControls) => {
          set({ itemControls });
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
        setShowTitleBar: (showTitleBar) => {
          set({ showTitleBar });
        },
        setOnSave: (onSave) => {
          set({ onSave });
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
