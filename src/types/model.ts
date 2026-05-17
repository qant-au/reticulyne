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
  connectorDirectionOptions
} from 'src/schemas';
import { StoreApi } from 'zustand';

export { connectorStyleOptions, connectorDirectionOptions } from 'src/schemas';
export type Model = z.infer<typeof modelSchema>;
export type ModelItems = z.infer<typeof modelItemsSchema>;
export type Icon = z.infer<typeof iconSchema>;
export type Icons = z.infer<typeof iconsSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type ModelItem = z.infer<typeof modelItemSchema>;
export type Views = z.infer<typeof viewsSchema>;
export type View = z.infer<typeof viewSchema>;
export type ViewItem = z.infer<typeof viewItemSchema>;
// Note: `ConnectorStyle` is a latent typing bug — `keyof typeof
// <const-array>` gives array-index keys ('0' | '1' | 'length' | ...)
// rather than the union of literal values. No consumer of
// `ConnectorStyle` currently exists (call sites use
// `Connector['style']` directly), so the bug is unobserved.
// `ConnectorDirection` below is declared correctly via the
// indexed-access pattern; flipping `ConnectorStyle` to match is a
// small follow-up tracked in TODO.md.
export type ConnectorStyle = keyof typeof connectorStyleOptions;
export type ConnectorDirection = (typeof connectorDirectionOptions)[number];
export type ConnectorAnchor = z.infer<typeof anchorSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type TextBox = z.infer<typeof textBoxSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;

export type ModelStore = Model & {
  actions: {
    get: StoreApi<ModelStore>['getState'];
    set: StoreApi<ModelStore>['setState'];
  };
};
