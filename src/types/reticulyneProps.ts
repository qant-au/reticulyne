import type { ErrorInfo, ReactNode } from 'react';
import type { ZodIssue } from 'zod';
import type { EditorModeEnum, MainMenuOptions } from './common';
import type { Connector, Model, ModelItem, View, ViewItem } from './model';
import type { RendererProps } from './rendererProps';
import type { SelectedRef, TourState, TourStep, Viewport } from './imperative';
import type { DiagramTemplate } from 'src/templates';
import type { Scene } from 'src/vendor/accurona-core';

export type NodeIndicatorComponent = (props: {
  item: ModelItem;
  view: ViewItem;
}) => ReactNode;

// FEA7-03: mirror of NodeIndicatorComponent for connectors. Renders
// at the connector's midpoint as an absolutely-positioned overlay
// inside the SceneLayers stack. Use it to surface link-level
// telemetry — throughput, latency, error rate, link-down status —
// driven by host state that isn't part of the model.
export type ConnectorIndicatorComponent = (props: {
  connector: Connector;
  view: View;
}) => ReactNode;

// 2.13: store an uploaded icon file and return where it can be loaded from.
// `readIconAsDataUrl` is a ready-made handler that embeds it in the diagram.
export type IconUploadHandler = (
  file: File
) => Promise<{ url: string; name?: string }>;

// A validation failure's issues, and, when the user opened a file through
// Main menu > Open, that file's name, so a message can name it as the
// editor build does.
export type ValidationErrorHandler = (
  issues: ZodIssue[],
  context?: { fileName?: string }
) => void;

// A Reticulyne model, the file format before the scene format. Still read
// (as `initialData`, by `loadModel` and by Open), converted to a scene on
// load, and never written. `title` is optional on input (1.2): the schema
// supplies 'Untitled', so a loaded Model always has one.
export type InitialData = Omit<Model, 'title'> & {
  title?: string;
  fitToView?: boolean;
  view?: string;
};

export interface ReticulyneProps {
  /**
   * The diagram to open: a scene (the file format), or a legacy
   * Reticulyne model, which is converted to a scene on load. Saves are
   * always scenes, merged into the one opened here.
   */
  initialData?: Scene | InitialData;
  mainMenuOptions?: MainMenuOptions;
  /**
   * Live state: called with the editor's model after every change. It is
   * a notification, not a save. To persist the diagram use `onSave` or
   * `useReticulyne().getScene()`, which give the scene.
   */
  onModelUpdated?: (Model: Model) => void;
  width?: number | string;
  height?: number | string;
  enableDebugTools?: boolean;
  editorMode?: keyof typeof EditorModeEnum;
  renderer?: RendererProps;
  onError?: (error: Error, info: ErrorInfo) => void;
  errorFallback?: ReactNode;
  /**
   * Filter the icon collections that reach the editor. Matches on
   * `Icon.collection` case-insensitively. If `allow` is supplied, only
   * icons whose collection matches one of the entries pass through. If
   * `deny` is supplied, icons whose collection matches are dropped. Both
   * can be combined (allow runs first, then deny refines the survivors).
   * When omitted, every icon in `initialData.icons` passes through unchanged.
   */
  iconCollections?: { allow?: string[]; deny?: string[] };
  /**
   * Override the title-bar visibility. When `undefined` (default), the
   * title bar follows the editor-mode allowlist —
   * `EDITABLE` / `EXPLORABLE_READONLY` show it, `NON_INTERACTIVE` hides it.
   * Pass `false` to force-hide it in every mode. Pass `true` to
   * force-show it in every mode.
   */
  showTitleBar?: boolean;
  /**
   * 2.9: while dragging, draw a guide line to the nearest other item on
   * the same tile X or Y. Default `true`.
   */
  showAlignmentGuides?: boolean;
  /**
   * 2.8: the overview map, bottom-right. Default: shown in `EDITABLE`,
   * hidden otherwise; pass `true` or `false` to force it.
   */
  showMiniMap?: boolean;
  /**
   * 1.6: a node was clicked (pressed and released without dragging). Fires
   * in `EDITABLE` and `EXPLORABLE_READONLY`, whether or not the click also
   * changed the selection.
   */
  onNodeClick?: (id: string) => void;
  /**
   * 2.13: adds an "Upload icon" button to the icon picker (editable
   * diagrams only). Receives the chosen file (SVG, PNG, JPEG, GIF or WebP,
   * at most 200 KB), stores it, and resolves with its URL; the icon joins a
   * "My icons" collection saved in the diagram. Reject with an Error to show
   * its message in the picker. Pass `readIconAsDataUrl` to embed the file
   * in the diagram JSON with no server. Sanitising SVG is the host's job
   * (see SECURITY.md).
   */
  onIconUpload?: IconUploadHandler;
  /**
   * Called after the user replaces the whole diagram from inside the
   * editor (New from template, or Clear). A host that stores diagrams by
   * id should treat what follows as a new diagram, or its next save (or
   * auto-save) overwrites the one that was open.
   */
  onDiagramReplaced?: () => void;
  /**
   * 2.14: the starter diagrams "New from template" offers. Default: the
   * bundled `TEMPLATES` (blank, three-tier web, AWS, Kubernetes, office
   * network). Pass your own to replace them; an empty array hides the entry.
   */
  templates?: DiagramTemplate[];
  /** 1.6: as `onNodeClick`, for a connector. */
  onConnectorClick?: (id: string) => void;
  /**
   * 1.6: the selection changed, from any source (click, marquee, keyboard,
   * `select()`). Receives a fresh copy; not called on mount.
   */
  onSelectionChange?: (selection: SelectedRef[]) => void;
  /**
   * 1.6: zoom, pan or the current view changed. Fires on every step of a
   * pan or pinch, so throttle in the host if the handler is expensive.
   * Not called on mount.
   */
  onViewportChange?: (viewport: Viewport) => void;
  /**
   * Optional callback fired when `initialData` (or a fresh
   * `loadModel()` payload from `useReticulyne`) fails schema validation.
   * Receives the array of Zod issues from the failed parse.
   *
   * When omitted, the failure is logged to `console.error` instead.
   * Earlier versions of the library popped a `window.alert`; that
   * blocked the consumer's UI on every malformed load and has been
   * replaced by this callback contract. Hook the callback up to your
   * error-reporting pipeline (Sentry, Datadog, etc.) if you care
   * about validation regressions reaching production.
   */
  onValidationError?: ValidationErrorHandler;
  /**
   * Invoked when the user clicks the "Save" menu entry, and by
   * auto-save. Receives the diagram as a scene (the file format): the
   * model merged into the scene that was opened, so plan views,
   * connections and anything else Reticulyne does not show are kept.
   * The host application is responsible for
   * persisting it however it wants — POSTing to a backend, queueing
   * for sync, etc.
   *
   * When omitted, the `'ACTION.SAVE'` menu entry is suppressed even
   * if it's listed in `mainMenuOptions`. Conversely, supplying
   * `onSave` does nothing on its own — the host must also list
   * `'ACTION.SAVE'` in `mainMenuOptions` for the menu entry to
   * appear.
   *
   * Callback identity does not need to be memoised — the component
   * stores it in the UI-state store and reads it at click time.
   *
   * 2.3: return a Promise to get an accurate status pill: "Saving…" while
   * it is pending, "Saved" when it resolves, and "Save failed" with a
   * Retry button when it rejects. A plain `void` return counts as saved.
   */
  onSave?: (scene: Scene) => void | Promise<unknown>;
  /**
   * 2.3: save automatically this many milliseconds after the last edit,
   * through `onSave`. Off (`false`) by default, so a host that wired
   * `onSave` for an explicit Save button is not suddenly saved on every
   * edit. Has no effect without `onSave`.
   */
  autoSaveDebounce?: number | false;
  /**
   * Opt-in flag for the connector animation feature (FEA5-06).
   * When `true`, connectors with `animated: true` render a moving
   * glyph along their path, and the "Animate" toggle appears in
   * the ConnectorControls panel. When `false` (default), the
   * animation never plays even if a connector's `animated` field
   * is set, and the toggle is hidden — so existing diagrams shipped
   * with `animated: true` look exactly like they did before opt-in.
   */
  enableAnimation?: boolean;
  /**
   * When `false`, pointer event listeners attach to the renderer element
   * rather than `window`, preventing drag events from leaking into host-page
   * sibling widgets when Reticulyne is embedded in a larger app. Defaults to
   * `true` for backwards compatibility.
   *
   * All pointer input (mouse, touch, stylus) is handled via the Pointer
   * Events API regardless of this setting (FEA10-01).
   */
  enableGlobalDragHandlers?: boolean;
  /**
   * When `false`, the keyboard-shortcut listener attaches to the renderer
   * element (made focusable) rather than `window`, so single-key tool and
   * zoom shortcuts (`V`/`H`/`R`/`C`/`T`/`+`/`-`/`0`/`1`/`F`/`?`) only fire
   * while the canvas has focus. This stops an embedded `<Reticulyne>` from
   * hijacking the host page's global keystrokes (FEA-07). Defaults to
   * `true` for backwards compatibility — the symmetric counterpart of
   * `enableGlobalDragHandlers`.
   */
  enableGlobalKeyboardShortcuts?: boolean;
  /**
   * Colour palette for the editor (FEA7-04). Default `'auto'` follows the
   * user-agent's `prefers-color-scheme` media query and updates live as it
   * changes. Pass `'light'` or `'dark'` to pin the mode explicitly.
   *
   * The mode is baked into Reticulyne's internal MUI `<ThemeProvider>`
   * (not inherited from any outer host theme) so embedders can mix
   * a dark Reticulyne inside an otherwise-light app and vice versa.
   *
   * **Breaking change (FEA9-01):** Default changed from `'light'` to
   * `'auto'`. Embedders that relied on the implicit light default should
   * now pass `themeMode="light"` explicitly.
   */
  themeMode?: 'light' | 'dark' | 'auto';
  /**
   * Controls the initial background colour in the PNG/PDF export dialog
   * (FEA9-01). Defaults to `'light'` so exported documents are always
   * readable regardless of the active editor theme. Pass `'dark'` for
   * tools that operate in a dark-only context and need dark exports.
   *
   * The user can still manually change the background colour inside the
   * export dialog; this prop only sets the initial value.
   */
  exportTheme?: 'light' | 'dark';
  /**
   * Optional per-node decorator. When supplied, the editor renders
   * this component inside every Node, positioned at the node's tile
   * and receiving the node's `ModelItem` + `ViewItem`. Use it to
   * overlay live indicators — status pips, gauges, badges,
   * mini-charts — driven by host state that isn't part of the
   * model (FEA5-07).
   *
   * The component renders inside an absolutely-positioned Box that
   * already follows the node's tile coordinates; return absolutely-
   * positioned content if you want to offset it (e.g. a gauge
   * positioned 20px to the right of the icon).
   */
  nodeIndicatorComponent?: NodeIndicatorComponent;
  /**
   * Optional per-connector decorator. When supplied, the editor
   * renders this component at every connector's midpoint, receiving
   * the connector's model shape and the parent View. Mirror of
   * `nodeIndicatorComponent` for link-level telemetry overlays
   * (FEA7-03).
   *
   * The component renders inside an absolutely-positioned Box that
   * already follows the connector's midpoint; return absolutely-
   * positioned content if you want to offset it further.
   */
  connectorIndicatorComponent?: ConnectorIndicatorComponent;
  /**
   * When set, the editor highlights the item with this ID and dims all
   * other items to `opacity: 0.2` with a CSS transition. Drives focus
   * from host-side navigation without touching interaction state (FEA12-01).
   *
   * When omitted, the `I` keyboard shortcut controls dimming based on
   * the current interactive selection instead.
   */
  highlightedItemId?: string;
  /**
   * lw-064: a presentation tour. When set, a Start tour button shows (in
   * every mode but NON_INTERACTIVE); the tour centres on each step's node
   * in turn, highlights it and shows its narration. The arrow keys step it
   * and Escape ends it. `useReticulyne().startTour()` starts it from code;
   * with no steps anywhere it walks every node on the view in reading order.
   */
  tour?: TourStep[];
  /**
   * lw-064: called with the tour's state each time it moves to a step, and
   * with `null` when it ends.
   */
  onTourStepChange?: (state: TourState | null) => void;
  /**
   * Optional children rendered inside the Reticulyne provider tree.
   * The intended use is a "driver" component that calls
   * `useReticulyne()` to drive the editor from outside — pulse
   * connectors on a timer, update colours from a poller, etc.
   * `useReticulyne` requires being a descendant of `<Reticulyne>` to
   * see the contextual stores; this prop is the supported way to
   * plant such a descendant.
   *
   * Driver components typically return `null`. Anything visible
   * rendered here will appear inside the editor frame.
   */
  children?: ReactNode;
}
