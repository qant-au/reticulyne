// Shared helpers for interaction-mode tests.
//
// Each mode handler in `src/interaction/modes/` is a pure function from
// `State` to void: it reads from `state.uiState`, `state.scene`,
// `state.rendererRef` etc., then either mutates outward through
// `uiState.actions.*` or through `scene.*` mutation methods.
//
// These helpers build a `State` good enough for those handlers without
// hitting Zustand or the real reducer chain. Every action / scene
// method is a `jest.fn()` so tests can assert on the exact calls the
// handler makes.

import type {
  ItemReference,
  Mode,
  Mouse,
  Scroll,
  UiStateStore,
  ModelStore
} from 'src/types';
import { CoordsUtils } from 'src/utils';
import type { useScene } from 'src/hooks/useScene';
import type { State } from 'src/types/interactions';

export type SceneShape = ReturnType<typeof useScene>;

export const makeMouse = (overrides: Partial<Mouse> = {}): Mouse => {
  return {
    position: {
      screen: CoordsUtils.zero(),
      tile: CoordsUtils.zero()
    },
    mousedown: null,
    delta: null,
    ...overrides
  };
};

export const makeScroll = (overrides: Partial<Scroll> = {}): Scroll => {
  return {
    position: CoordsUtils.zero(),
    offset: CoordsUtils.zero(),
    ...overrides
  };
};

export const makeUiStateActions = () => {
  return {
    setView: jest.fn(),
    setMainMenuOptions: jest.fn(),
    setEditorMode: jest.fn(),
    setIconCategoriesState: jest.fn(),
    resetUiState: jest.fn(),
    setMode: jest.fn(),
    incrementZoom: jest.fn(),
    decrementZoom: jest.fn(),
    setIsMainMenuOpen: jest.fn(),
    setDialog: jest.fn(),
    setZoom: jest.fn(),
    setScroll: jest.fn(),
    setItemControls: jest.fn(),
    setContextMenu: jest.fn(),
    setMouse: jest.fn(),
    setRendererEl: jest.fn(),
    setEnableDebugTools: jest.fn(),
    setEnableAnimation: jest.fn(),
    setExportTheme: jest.fn(),
    setClipboard: jest.fn(),
    panScroll: jest.fn(),
    setShowTitleBar: jest.fn(),
    setOnSave: jest.fn(),
    setNodeIndicatorComponent: jest.fn(),
    setConnectorIndicatorComponent: jest.fn()
  };
};

export const makeUiState = (overrides: {
  mode: Mode;
  mouse?: Partial<Mouse>;
  scroll?: Partial<Scroll>;
}): UiStateStore => {
  const actions = makeUiStateActions();
  return {
    view: 'view1',
    mainMenuOptions: [],
    editorMode: 'EDITABLE',
    iconCategoriesState: [],
    mode: overrides.mode,
    dialog: null,
    isMainMenuOpen: false,
    itemControls: null,
    contextMenu: null,
    zoom: 1,
    scroll: makeScroll(overrides.scroll ?? {}),
    mouse: makeMouse(overrides.mouse ?? {}),
    rendererEl: null,
    enableDebugTools: false,
    actions
  } as unknown as UiStateStore;
};

export const makeScene = (overrides: Partial<SceneShape> = {}): SceneShape => {
  return {
    items: [],
    connectors: [],
    rectangles: [],
    textBoxes: [],
    colors: [{ id: 'color1', value: '#abcdef' }],
    currentView: {
      id: 'view1',
      name: 'View1',
      items: [],
      connectors: [],
      rectangles: [],
      textBoxes: []
    },
    createModelItem: jest.fn(),
    updateModelItem: jest.fn(),
    deleteModelItem: jest.fn(),
    createViewItem: jest.fn(),
    updateViewItem: jest.fn(),
    deleteViewItem: jest.fn(),
    createConnector: jest.fn(),
    updateConnector: jest.fn(),
    deleteConnector: jest.fn(),
    createTextBox: jest.fn(),
    updateTextBox: jest.fn(),
    deleteTextBox: jest.fn(),
    createRectangle: jest.fn(),
    updateRectangle: jest.fn(),
    deleteRectangle: jest.fn(),
    changeLayerOrder: jest.fn(),
    duplicateItem: jest.fn(),
    ...overrides
  } as unknown as SceneShape;
};

export const makeState = (overrides: {
  mode: Mode;
  mouse?: Partial<Mouse>;
  scroll?: Partial<Scroll>;
  scene?: Partial<SceneShape>;
  rendererRef?: HTMLElement;
  rendererSize?: { width: number; height: number };
  isRendererInteraction?: boolean;
}): State => {
  return {
    model: {} as unknown as ModelStore,
    scene: makeScene(overrides.scene),
    uiState: makeUiState({
      mode: overrides.mode,
      mouse: overrides.mouse,
      scroll: overrides.scroll
    }),
    rendererRef:
      overrides.rendererRef ??
      (document.createElement('div') as unknown as HTMLElement),
    rendererSize: overrides.rendererSize ?? { width: 1000, height: 1000 },
    isRendererInteraction: overrides.isRendererInteraction ?? true
  };
};

/**
 * Helper that asserts a specific ItemReference shape was the most-recent
 * argument to `uiState.actions.setMode`. Use to check that a mode
 * transition switched to the expected next mode.
 */
export const lastModeChange = (state: State): Mode | undefined => {
  const calls = (state.uiState.actions.setMode as jest.Mock).mock.calls;
  return calls.length > 0 ? (calls[calls.length - 1][0] as Mode) : undefined;
};

/** Build an ItemReference quickly. */
export const ref = (type: ItemReference['type'], id: string): ItemReference => {
  return { type, id };
};
