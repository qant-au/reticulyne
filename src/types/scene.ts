import type { Coords, Rect } from './common';

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

// The runtime scene shapes (`Scene`, `SceneConnector`, `SceneTextBox`,
// `SceneConnectorOverlay`, `SceneStore`) live in `./internal` (QUA-03) to
// keep the zustand-store types off the published public surface.
