import type { ErrorInfo, ReactNode } from 'react';
import type { ZodIssue } from 'zod';
import type { EditorModeEnum, MainMenuOptions } from './common';
import type { Model } from './model';
import type { RendererProps } from './rendererProps';

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
}
