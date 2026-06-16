// QUA-03: internal store/runtime shapes kept off the published public
// surface. These types describe the editor's Zustand stores and the
// transient interaction state they hold. They are re-exported through the
// `src/types` barrel for internal consumers, but the public entry
// (`standaloneExports.ts`) re-exports the barrel only selectively, so none
// of these names leak into the package's `.d.ts` — in particular the
// `*Store` types that expose `zustand.StoreApi` stay private.
import { StoreApi } from 'zustand';
import {
  EditorModeEnum,
  type Coords,
  type Size,
  type MainMenuOptions
} from './common';
import type {
  Model,
  Icon,
  ModelItem,
  ViewItem,
  TextBox,
  Rectangle
} from './model';
import type { ItemReference, ConnectorPath } from './scene';
import { DialogTypeEnum, type AnchorPosition } from './ui';
import type {
  ConnectorIndicatorComponent,
  NodeIndicatorComponent
} from './reticulyneProps';

// === Model store ===
export type ModelStore = Model & {
  actions: {
    get: StoreApi<ModelStore>['getState'];
    set: StoreApi<ModelStore>['setState'];
  };
};

// === Scene (runtime, derived) ===
export interface SceneConnector {
  path: ConnectorPath;
}

export interface SceneTextBox {
  size: Size;
}

// FEA5-07: per-connector runtime overlay for transient host-driven
// state — pulses, flashes, anything that should NOT round-trip
// through the model or get serialised when the host saves.
export interface SceneConnectorOverlay {
  // Epoch-ms at which the currently-active pulse animation ends.
  // The presence of this field is the signal "render the pulse";
  // the host-side timer removes the overlay entry entirely so a
  // subsequent pulse can re-trigger cleanly. Stored (rather than
  // computed at render time) so the cleanup setTimeout can detect
  // whether THIS pulse is still the active one, or whether a fresh
  // pulse has superseded it.
  pulseExpiresAt?: number;
  // Total duration of the in-flight pulse, in ms. Passed through
  // to the GlyphRenderer's `motion.durSeconds` so the moving glyph
  // travels the connector once over exactly this interval.
  pulseDurationMs?: number;
  // Snapshot of the glyph at the time the pulse was triggered. The
  // connector's persistent `glyph` field may change while the pulse
  // is in-flight; freezing it here keeps the moving glyph stable
  // for the duration of the animation. When undefined, the renderer
  // falls back to the connector's current `glyph` field.
  pulseGlyph?: string;
}

export interface Scene {
  connectors: {
    [key: string]: SceneConnector;
  };
  connectorOverlays: {
    [key: string]: SceneConnectorOverlay;
  };
  textBoxes: {
    [key: string]: SceneTextBox;
  };
}

export type SceneStore = Scene & {
  actions: {
    get: StoreApi<SceneStore>['getState'];
    set: StoreApi<SceneStore>['setState'];
  };
};

// === UI-state runtime shapes ===
interface AddItemControls {
  type: 'ADD_ITEM';
}

export type ItemControls = ItemReference | AddItemControls;

export interface Mouse {
  position: {
    screen: Coords;
    tile: Coords;
  };
  mousedown: {
    screen: Coords;
    tile: Coords;
  } | null;
  delta: {
    screen: Coords;
    tile: Coords;
  } | null;
}

// Mode types
export interface InteractionsDisabled {
  type: 'INTERACTIONS_DISABLED';
  showCursor: boolean;
}

export interface CursorMode {
  type: 'CURSOR';
  showCursor: boolean;
  mousedownItem: ItemReference | null;
}

export interface DragItemsMode {
  type: 'DRAG_ITEMS';
  showCursor: boolean;
  items: ItemReference[];
  isInitialMovement: boolean;
}

export interface PanMode {
  type: 'PAN';
  showCursor: boolean;
}

export interface PlaceIconMode {
  type: 'PLACE_ICON';
  showCursor: boolean;
  id: string | null;
}

export interface ConnectorMode {
  type: 'CONNECTOR';
  showCursor: boolean;
  id: string | null;
}

export interface DrawRectangleMode {
  type: 'RECTANGLE.DRAW';
  showCursor: boolean;
  id: string | null;
}

export interface TransformRectangleMode {
  type: 'RECTANGLE.TRANSFORM';
  showCursor: boolean;
  id: string;
  selectedAnchor: AnchorPosition | null;
}

export interface TextBoxMode {
  type: 'TEXTBOX';
  showCursor: boolean;
  id: string | null;
}

export type Mode =
  | InteractionsDisabled
  | CursorMode
  | PanMode
  | PlaceIconMode
  | ConnectorMode
  | DrawRectangleMode
  | TransformRectangleMode
  | DragItemsMode
  | TextBoxMode;
// End mode types

export interface Scroll {
  position: Coords;
  offset: Coords;
}

export interface IconCollectionState {
  id?: string;
  isExpanded: boolean;
}

export type IconCollectionStateWithIcons = IconCollectionState & {
  icons: Icon[];
};

export interface ContextMenu {
  item: ItemReference;
  tile: Coords;
}

// FEA5-04: clipboard contents. Snapshots the data needed to paste a
// copy of the original later; connectors are deliberately excluded
// for the same anchor-semantics reason that useScene.duplicateItem
// skips them (see useScene.ts:328).
export type ClipboardEntry =
  | {
      kind: 'ITEM';
      modelItem: ModelItem;
      viewItem: ViewItem;
    }
  | { kind: 'TEXTBOX'; textBox: TextBox }
  | { kind: 'RECTANGLE'; rectangle: Rectangle };

export interface UiState {
  view: string;
  mainMenuOptions: MainMenuOptions;
  editorMode: keyof typeof EditorModeEnum;
  iconCategoriesState: IconCollectionState[];
  mode: Mode;
  dialog: keyof typeof DialogTypeEnum | null;
  isMainMenuOpen: boolean;
  itemControls: ItemControls | null;
  contextMenu: ContextMenu | null;
  zoom: number;
  scroll: Scroll;
  mouse: Mouse;
  rendererEl: HTMLDivElement | null;
  enableDebugTools: boolean;
  enableAnimation: boolean;
  exportTheme: 'light' | 'dark';
  showTitleBar: boolean | undefined;
  clipboard: ClipboardEntry | null;
  // Host-supplied save callback (FEA5-03). The MainMenu's
  // 'ACTION.SAVE' entry renders only when this is defined, and the
  // click handler hands the current model snapshot back to the host
  // via this function. Stored on the store rather than in component
  // state so the MainMenu (a child of the App) can read it through
  // the existing zustand subscription path.
  onSave: ((model: Model) => void) | undefined;
  // Host-supplied per-node decorator (FEA5-07). When defined, the
  // Node renderer reads it through the uiState store and renders it
  // inside every Node.
  nodeIndicatorComponent: NodeIndicatorComponent | undefined;
  // FEA7-03: host-supplied per-connector decorator. Rendered at each
  // connector's midpoint via the ConnectorIndicators scene layer.
  connectorIndicatorComponent: ConnectorIndicatorComponent | undefined;
  // FEA12-01: selection dimming. When selectionDimEnabled is true
  // and exactly one item is selected, all other items render at
  // reduced opacity. highlightedItemId lets the host drive the same
  // visual from outside without touching interaction state.
  selectionDimEnabled: boolean;
  highlightedItemId: string | undefined;
}

export interface UiStateActions {
  setView: (view: string) => void;
  setMainMenuOptions: (options: MainMenuOptions) => void;
  setEditorMode: (mode: keyof typeof EditorModeEnum) => void;
  setIconCategoriesState: (iconCategoriesState: IconCollectionState[]) => void;
  resetUiState: () => void;
  setMode: (mode: Mode) => void;
  incrementZoom: () => void;
  decrementZoom: () => void;
  setIsMainMenuOpen: (isOpen: boolean) => void;
  setDialog: (dialog: keyof typeof DialogTypeEnum | null) => void;
  setZoom: (zoom: number) => void;
  setScroll: (scroll: Scroll) => void;
  panScroll: (delta: Coords) => void;
  setClipboard: (entry: ClipboardEntry | null) => void;
  setItemControls: (itemControls: ItemControls | null) => void;
  setContextMenu: (contextMenu: ContextMenu | null) => void;
  setMouse: (mouse: Mouse) => void;
  setRendererEl: (el: HTMLDivElement) => void;
  setEnableDebugTools: (enabled: boolean) => void;
  setEnableAnimation: (enabled: boolean) => void;
  setExportTheme: (mode: 'light' | 'dark') => void;
  setShowTitleBar: (show: boolean | undefined) => void;
  setOnSave: (onSave: ((model: Model) => void) | undefined) => void;
  setNodeIndicatorComponent: (
    component: NodeIndicatorComponent | undefined
  ) => void;
  setConnectorIndicatorComponent: (
    component: ConnectorIndicatorComponent | undefined
  ) => void;
  setSelectionDimEnabled: (enabled: boolean) => void;
  toggleSelectionDimEnabled: () => void;
  setHighlightedItemId: (id: string | undefined) => void;
}

export type UiStateStore = UiState & {
  actions: UiStateActions;
};
