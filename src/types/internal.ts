// QUA-03: internal store/runtime shapes kept off the published public
// surface. These types describe the editor's Zustand stores and the
// transient interaction state they hold. They are re-exported through the
// `src/types` barrel for internal consumers, but the public entry
// (`standaloneExports.ts`) re-exports the barrel only selectively, so none
// of these names leak into the package's `.d.ts` — in particular the
// `*Store` types that expose `zustand.StoreApi` stay private.
import { StoreApi } from 'zustand';
import type { ZodIssue } from 'zod';
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
import type { QueuedPatch } from './imperative';
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

// 2.3: a host save callback may return a Promise; the editor awaits it
// to show Saving / Saved / failed.
export type SaveHandler = (model: Model) => void | Promise<unknown>;

export interface SaveStatus {
  state: 'idle' | 'saving' | 'saved' | 'error';
  /** The model differs from what was last saved (or loaded). */
  isDirty: boolean;
  lastSavedAt: number | null;
  /** Fingerprint of the model as last saved or loaded. */
  savedFingerprint: string | null;
  error: string | null;
}

interface AddItemControls {
  type: 'ADD_ITEM';
  /**
   * 2.2: set when the picker was opened by double-clicking an empty tile.
   * Picking an icon then places it here at once, instead of arming it
   * for a click.
   */
  tile?: Coords;
}

export type ItemControls = ItemReference | AddItemControls;

// 1.4: the multi-selection set. `selection` is authoritative; `itemControls`
// stays the single "inspector target" it has always been so the existing
// single-item panels, transform anchors and dimming keep working untouched.
//
// The two are maintained together by the store — `setItemControls` rewrites
// `selection`, and `setSelection` rewrites `itemControls` — so there is one
// writer per mutation and the pair cannot drift. The invariant is:
//
//   selection.length === 0  ->  itemControls is null or { type: 'ADD_ITEM' }
//   selection.length >= 1   ->  itemControls === selection[selection.length - 1]
//
// i.e. the inspector target is always the most recently added member of the
// selection, which is what a user means by "the one I just clicked".
export type Selection = ItemReference[];

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

// 1.4: marquee ("rubber band") drag-select. Entered from CURSOR when the
// user presses on empty canvas and moves. `from` is the tile the drag
// started on, `to` tracks the pointer.
//
// `base` is the selection as it stood when the drag began — empty for a
// plain drag, the existing selection for a Shift-drag. The live selection
// is recomputed every move as `base ∪ caught`, never accumulated onto the
// previous frame's result: accumulating means shrinking the band can only
// ever add, so items swept up early stay stuck to the selection for the
// rest of the gesture.
export interface MarqueeMode {
  type: 'MARQUEE';
  showCursor: boolean;
  from: Coords;
  to: Coords;
  base: ItemReference[];
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
  | MarqueeMode
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
  // 1.4: see the `Selection` doc comment above for the invariant tying
  // this to `itemControls`. Empty array = nothing selected.
  selection: Selection;
  contextMenu: ContextMenu | null;
  zoom: number;
  scroll: Scroll;
  mouse: Mouse;
  rendererEl: HTMLDivElement | null;
  enableDebugTools: boolean;
  enableAnimation: boolean;
  exportTheme: 'light' | 'dark';
  showTitleBar: boolean | undefined;
  // 2.9: alignment guides while dragging.
  showAlignmentGuides: boolean;
  // 2.7: find bar open, and the node ids it currently matches.
  searchOpen: boolean;
  // 2.11: the persistent icon palette.
  iconPaletteOpen: boolean;
  // 2.8: undefined = shown when EDITABLE only.
  showMiniMap: boolean | undefined;
  searchMatches: string[];
  // 1.6: host click callbacks, fired by the interaction manager.
  onNodeClick: ((id: string) => void) | undefined;
  onConnectorClick: ((id: string) => void) | undefined;
  // 1.5: imperative patches that arrived mid-gesture, applied when it ends.
  patchQueue: QueuedPatch[];
  // Worklist 19: a list, so a multi-selection copies as one.
  clipboard: ClipboardEntry[];
  // Host-supplied save callback (FEA5-03). The MainMenu's
  // 'ACTION.SAVE' entry renders only when this is defined, and the
  // click handler hands the current model snapshot back to the host
  // via this function. Stored on the store rather than in component
  // state so the MainMenu (a child of the App) can read it through
  // the existing zustand subscription path.
  onSave: SaveHandler | undefined;
  // 2.3: where saving stands. See src/utils/save.ts.
  saveStatus: SaveStatus;
  // SEC-02: host-supplied validation-error callback, mirrored onto the
  // store (like onSave) so useReticulyne().Model.set can route
  // merge-then-validate failures through the same channel the
  // <Reticulyne onValidationError> prop uses for initialData/loadModel.
  onValidationError: ((issues: ZodIssue[]) => void) | undefined;
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
  setClipboard: (entries: ClipboardEntry[]) => void;
  setItemControls: (itemControls: ItemControls | null) => void;
  // 1.4 selection actions. All three keep `itemControls` in step.
  setSelection: (selection: Selection) => void;
  // Adds the reference if absent, removes it if present (Shift+click).
  toggleSelected: (item: ItemReference) => void;
  clearSelection: () => void;
  setContextMenu: (contextMenu: ContextMenu | null) => void;
  setMouse: (mouse: Mouse) => void;
  setRendererEl: (el: HTMLDivElement) => void;
  setEnableDebugTools: (enabled: boolean) => void;
  setEnableAnimation: (enabled: boolean) => void;
  setExportTheme: (mode: 'light' | 'dark') => void;
  setShowTitleBar: (show: boolean | undefined) => void;
  setShowAlignmentGuides: (show: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setIconPaletteOpen: (open: boolean) => void;
  setShowMiniMap: (show: boolean | undefined) => void;
  setSearchMatches: (ids: string[]) => void;
  setClickHandlers: (handlers: {
    onNodeClick: ((id: string) => void) | undefined;
    onConnectorClick: ((id: string) => void) | undefined;
  }) => void;
  enqueuePatch: (entry: QueuedPatch) => void;
  /** Empties the queue and returns what was in it. */
  takePatches: () => QueuedPatch[];
  setOnSave: (onSave: SaveHandler | undefined) => void;
  setSaveStatus: (patch: Partial<SaveStatus>) => void;
  /** Read at call time, for async code that must not use a stale render. */
  getSaveStatus: () => SaveStatus;
  /** The whole store, read at call time (imperative API and patch queue). */
  get: () => UiState & { actions: UiStateActions };
  setOnValidationError: (
    onValidationError: ((issues: ZodIssue[]) => void) | undefined
  ) => void;
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
