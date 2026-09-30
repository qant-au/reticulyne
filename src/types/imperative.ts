import type { Coords } from './common';
import type { Connector, Group, Rectangle, TextBox } from './model';

// the shapes the imperative API (useReticulyne) takes
// and returns. Read methods hand back these narrow DTOs, never the store's
// own objects, so a host cannot mutate editor state by holding a reference.

/** Fields a patch may change on a node. `tile` moves it on the current view. */
export interface NodePatch {
  name?: string;
  description?: string;
  icon?: string;
  tile?: Coords;
}

export type ConnectorPatch = Partial<
  Pick<
    Connector,
    | 'description'
    | 'color'
    | 'width'
    | 'style'
    | 'direction'
    | 'glyph'
    | 'animated'
    | 'animationRate'
    | 'animationFlow'
  >
>;

export type RectanglePatch = Partial<
  Pick<Rectangle, 'color' | 'colorValue' | 'outlineColor' | 'transparency'>
>;

export type TextBoxPatch = Partial<Pick<TextBox, 'content' | 'fontSize'>>;

/** 1.7: a group's label and backing colour. */
export type GroupPatch = Partial<Pick<Group, 'name' | 'color' | 'collapsed'>>;

/**
 * A set of changes keyed by id. Node fields apply wherever the node is;
 * `tile`, connectors, rectangles and text boxes apply to the current view.
 * An id that no longer exists is skipped without error.
 */
export interface DiagramPatch {
  items?: Record<string, NodePatch>;
  connectors?: Record<string, ConnectorPatch>;
  rectangles?: Record<string, RectanglePatch>;
  textBoxes?: Record<string, TextBoxPatch>;
  groups?: Record<string, GroupPatch>;
}

export interface ApplyPatchOptions {
  /**
   * Record the change on the undo stack. Default `false`: a live data
   * feed should not fill Ctrl+Z with updates the user never made.
   */
  pushToUndo?: boolean;
}

/** A node as the host sees it. `tile` is null when it is not on the current view. */
export interface NodeInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tile: Coords | null;
}

export interface Viewport {
  zoom: number;
  /** Pan offset in screen pixels; `{0, 0}` centres the diagram's origin. */
  scroll: Coords;
  viewId: string;
}

export type SelectableType = 'ITEM' | 'CONNECTOR' | 'RECTANGLE' | 'TEXTBOX';

export interface SelectedRef {
  type: SelectableType;
  id: string;
}

/**
 * lw-064: one stop on a presentation tour. The tour centres on `nodeId`,
 * on `viewId` if given, or else on the view on show when it holds the node,
 * or else the first view that does.
 */
export interface TourStep {
  nodeId: string;
  viewId?: string;
  /** Zoom for this stop, clamped. Defaults to 0.8. */
  zoom?: number;
  /** Heading on the narration panel. Defaults to the node's name. */
  title?: string;
  /**
   * Narration, as rich text in the same format as a node description.
   * Defaults to the node's description.
   */
  narration?: string;
}

/** Where a running tour stands. `index` counts from 0. */
export interface TourState {
  index: number;
  total: number;
  step: TourStep;
}

export interface QueuedPatch {
  patch: DiagramPatch;
  options: ApplyPatchOptions;
}
