import { StoreApi } from 'zustand';
import type { Coords, Rect, Size } from './common';

export const tileOriginOptions = {
  CENTER: 'CENTER',
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
} as const;

export type TileOrigin = keyof typeof tileOriginOptions;

export const ItemReferenceTypeOptions = {
  ITEM: 'ITEM',
  CONNECTOR: 'CONNECTOR',
  CONNECTOR_ANCHOR: 'CONNECTOR_ANCHOR',
  TEXTBOX: 'TEXTBOX',
  RECTANGLE: 'RECTANGLE'
} as const;

export type ItemReferenceType = keyof typeof ItemReferenceTypeOptions;

export type ItemReference = {
  type: ItemReferenceType;
  id: string;
};

export type ConnectorPath = {
  tiles: Coords[];
  rectangle: Rect;
};

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
