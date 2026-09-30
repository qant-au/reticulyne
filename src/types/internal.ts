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
  Rectangle,
  Colors,
  Connector,
  Group
} from './model';
import type { ItemReference, ConnectorPath } from './scene';
import type { QueuedPatch, TourState, TourStep } from './imperative';
import type { Scene as SceneDocument } from 'src/vendor/accurona-core';
import type { SceneContext } from 'src/scene/convert';
import type { DiagramTemplate } from 'src/templates';
import { DialogTypeEnum, type AnchorPosition } from './ui';
import type {
  ConnectorIndicatorComponent,
  IconUploadHandler,
  NodeIndicatorComponent,
  ValidationErrorHandler
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
// to show Saving / Saved / failed. It is handed the diagram as a scene,
// the file format.
export type SaveHandler = (scene: SceneDocument) => void | Promise<unknown>;

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
// user presses on empty canvas and moves. `from` is where the drag
// started and `to` tracks the pointer, both in px relative to the canvas:
// the band is the rectangle the pointer draws on the screen, not a box of
// tiles (which in the isometric view is a diamond elsewhere).
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
  /**
   * lw-055: placing a scene object another editor placed (a device on the
   * floor plan). The item keeps the object's id, so the two are linked.
   */
  object?: { id: string; name: string; icon?: string };
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
  // null: the empty canvas (lw-069, for Unlock all).
  item: ItemReference | null;
  tile: Coords;
}

// FEA5-04: clipboard contents. Snapshots the data needed to paste a
// copy of the original later; connectors are deliberately excluded
// for the same anchor-semantics reason that useScene.duplicateItem
// skips them (see useScene.ts:328).
export type ClipboardEntry =
  // The icon and colour an entry refers to travel with it, so a paste
  // into another diagram can add them there instead of leaving a
  // dangling reference the schema then rejects.
  | {
      kind: 'ITEM';
      modelItem: ModelItem;
      viewItem: ViewItem;
      icon?: Icon;
    }
  | { kind: 'TEXTBOX'; textBox: TextBox }
  | { kind: 'RECTANGLE'; rectangle: Rectangle; color?: Colors[number] }
  // A connector whose ends are both in the copy, rewired to the copies.
  | { kind: 'CONNECTOR'; connector: Connector }
  // A group with at least two copied members, recreated around the copies.
  | { kind: 'GROUP'; group: Group };

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
  // The level the zoom was last set to other than by a zoom step (Fit,
  // wheel, host); kept on the zoom-step ladder so out retraces in.
  zoomAnchor: number | null;
  scroll: Scroll;
  mouse: Mouse;
  rendererEl: HTMLDivElement | null;
  enableDebugTools: boolean;
  enableAnimation: boolean;
  exportTheme: 'light' | 'dark';
  // The background colour last chosen in the PNG or SVG export dialog, kept
  // for the session so reopening either dialog keeps it. Unset: the export
  // theme's diagram background.
  exportBackgroundColor: string | undefined;
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
  // 2.13: host icon upload; the picker's Upload button shows when set.
  onIconUpload: IconUploadHandler | undefined;
  onDiagramReplaced: (() => void) | undefined;
  // Bumped by every load, whichever useInitialDataManager ran it, so the
  // save status can re-baseline (isReady alone does not change between
  // two loads: both of its flips land in one render).
  loadGeneration: number;
  // The scene the diagram was opened from, and the kind of each view it
  // had. A save merges the model into it (src/scene); every load, Clear
  // and template replaces it.
  sceneContext: SceneContext;
  // A text box just placed: its inspector takes focus once, so typing
  // goes into it instead of running as tool shortcuts.
  focusTextBoxId: string | null;
  // lw-068: the latest screen-reader announcement; seq changes on each one.
  announcement: { text: string; seq: number };
  // 1.7: the group entered by double-click; clicks select inside it.
  editingGroupId: string | null;
  // lw-052: the Redacted layer is left off the canvas, only while the
  // PDF export captures it.
  hideRedacted: boolean;
  // lw-053: the other floors drawn faintly behind the one on show.
  showOtherFloors: boolean;
  // 2.14: what "New from template" offers.
  templates: DiagramTemplate[];
  // 2.3: where saving stands. See src/utils/save.ts.
  saveStatus: SaveStatus;
  // SEC-02: host-supplied validation-error callback, mirrored onto the
  // store (like onSave) so useReticulyne().Model.set can route
  // merge-then-validate failures through the same channel the
  // <Reticulyne onValidationError> prop uses for initialData/loadModel.
  onValidationError: ValidationErrorHandler | undefined;
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
  // lw-064: the tour running, if any. `hostHighlight` is what
  // highlightedItemId was before it started, restored when it ends.
  tour: ActiveTour | null;
  // The steps offered by the `tour` prop; a Start tour button shows when set.
  tourSteps: TourStep[] | undefined;
  onTourStepChange: ((state: TourState | null) => void) | undefined;
}

export interface ActiveTour {
  steps: TourStep[];
  index: number;
  hostHighlight: string | undefined;
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
  setExportBackgroundColor: (color: string) => void;
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
  setOnIconUpload: (handler: IconUploadHandler | undefined) => void;
  setOnDiagramReplaced: (handler: (() => void) | undefined) => void;
  markLoaded: () => void;
  setSceneContext: (context: SceneContext) => void;
  announce: (text: string) => void;
  setFocusTextBoxId: (id: string | null) => void;
  setTemplates: (templates: DiagramTemplate[]) => void;
  setEditingGroupId: (id: string | null) => void;
  setHideRedacted: (hideRedacted: boolean) => void;
  setShowOtherFloors: (showOtherFloors: boolean) => void;
  setSaveStatus: (patch: Partial<SaveStatus>) => void;
  /** Read at call time, for async code that must not use a stale render. */
  getSaveStatus: () => SaveStatus;
  /** The whole store, read at call time (imperative API and patch queue). */
  get: () => UiState & { actions: UiStateActions };
  setOnValidationError: (
    onValidationError: ValidationErrorHandler | undefined
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
  setTour: (tour: ActiveTour | null) => void;
  setTourSteps: (steps: TourStep[] | undefined) => void;
  setOnTourStepChange: (
    handler: ((state: TourState | null) => void) | undefined
  ) => void;
}

export type UiStateStore = UiState & {
  actions: UiStateActions;
};
