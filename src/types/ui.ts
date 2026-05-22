import { Coords, EditorModeEnum, MainMenuOptions } from './common';
import { Icon, Model } from './model';
import type {
  ConnectorIndicatorComponent,
  NodeIndicatorComponent
} from './isoflowProps';
import { ItemReference } from './scene';

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

export const AnchorPositionOptions = {
  BOTTOM_LEFT: 'BOTTOM_LEFT',
  BOTTOM_RIGHT: 'BOTTOM_RIGHT',
  TOP_RIGHT: 'TOP_RIGHT',
  TOP_LEFT: 'TOP_LEFT'
} as const;

export type AnchorPosition = keyof typeof AnchorPositionOptions;

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

export const DialogTypeEnum = {
  EXPORT_IMAGE: 'EXPORT_IMAGE'
} as const;

export interface ContextMenu {
  item: ItemReference;
  tile: Coords;
}

export const LayerOrderingActionOptions = {
  BRING_TO_FRONT: 'BRING_TO_FRONT',
  SEND_TO_BACK: 'SEND_TO_BACK',
  BRING_FORWARD: 'BRING_FORWARD',
  SEND_BACKWARD: 'SEND_BACKWARD'
} as const;

export type LayerOrderingAction = keyof typeof LayerOrderingActionOptions;

// FEA5-04: clipboard contents. Snapshots the data needed to paste a
// copy of the original later; connectors are deliberately excluded
// for the same anchor-semantics reason that useScene.duplicateItem
// skips them (see useScene.ts:328).
export type ClipboardEntry =
  | {
      kind: 'ITEM';
      modelItem: import('./model').ModelItem;
      viewItem: import('./model').ViewItem;
    }
  | { kind: 'TEXTBOX'; textBox: import('./model').TextBox }
  | { kind: 'RECTANGLE'; rectangle: import('./model').Rectangle };

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
  setShowTitleBar: (show: boolean | undefined) => void;
  setOnSave: (onSave: ((model: Model) => void) | undefined) => void;
  setNodeIndicatorComponent: (
    component: NodeIndicatorComponent | undefined
  ) => void;
  setConnectorIndicatorComponent: (
    component: ConnectorIndicatorComponent | undefined
  ) => void;
}

export type UiStateStore = UiState & {
  actions: UiStateActions;
};
