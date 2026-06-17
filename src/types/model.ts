import z from 'zod';
import {
  iconSchema,
  modelSchema,
  modelItemSchema,
  modelItemsSchema,
  viewsSchema,
  viewSchema,
  viewItemSchema,
  connectorSchema,
  iconsSchema,
  colorsSchema,
  anchorSchema,
  textBoxSchema,
  rectangleSchema,
  connectorStyleOptions,
  connectorDirectionOptions,
  connectorGlyphOptions,
  connectorAnimationFlowOptions
} from 'src/schemas';

export {
  connectorStyleOptions,
  connectorDirectionOptions,
  connectorGlyphOptions,
  connectorAnimationFlowOptions
} from 'src/schemas';
export type Model = z.infer<typeof modelSchema>;
export type ModelItems = z.infer<typeof modelItemsSchema>;
export type Icon = z.infer<typeof iconSchema>;
export type Icons = z.infer<typeof iconsSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type ModelItem = z.infer<typeof modelItemSchema>;
export type Views = z.infer<typeof viewsSchema>;
export type View = z.infer<typeof viewSchema>;
export type ViewItem = z.infer<typeof viewItemSchema>;
export type ConnectorStyle = (typeof connectorStyleOptions)[number];
export type ConnectorDirection = (typeof connectorDirectionOptions)[number];
export type ConnectorGlyph = (typeof connectorGlyphOptions)[number];
export type ConnectorAnimationFlow =
  (typeof connectorAnimationFlowOptions)[number];
export type ConnectorAnchor = z.infer<typeof anchorSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type TextBox = z.infer<typeof textBoxSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;

// `ModelStore` (the zustand store shape) lives in `./internal` (QUA-03)
// so it stays off the published public surface — `standaloneExports.ts`
// re-exports `./model` wholesale, and we don't want `StoreApi` leaking
// into the package `.d.ts`.
