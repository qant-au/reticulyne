import type { ErrorInfo, ReactNode } from 'react';
import type { ZodIssue } from 'zod';
import type { EditorModeEnum, MainMenuOptions } from './common';
import type { Model, ModelItem, ViewItem } from './model';
import type { RendererProps } from './rendererProps';

export type NodeIndicatorComponent = (props: {
  item: ModelItem;
  view: ViewItem;
}) => ReactNode;

export type InitialData = Model & {
  fitToView?: boolean;
  view?: string;
};

export interface IsoflowProps {
  initialData?: InitialData;
  mainMenuOptions?: MainMenuOptions;
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
   * Optional callback fired when `initialData` (or a fresh
   * `loadModel()` payload from `useIsoflow`) fails schema validation.
   * Receives the array of Zod issues from the failed parse.
   *
   * When omitted, the failure is logged to `console.error` instead.
   * Earlier versions of the library popped a `window.alert`; that
   * blocked the consumer's UI on every malformed load and has been
   * replaced by this callback contract. Hook the callback up to your
   * error-reporting pipeline (Sentry, Datadog, etc.) if you care
   * about validation regressions reaching production.
   */
  onValidationError?: (issues: ZodIssue[]) => void;
  /**
   * Invoked when the user clicks the "Save" menu entry. Receives the
   * current model snapshot. The host application is responsible for
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
   */
  onSave?: (model: Model) => void;
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
}
