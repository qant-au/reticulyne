import { z } from 'zod';
import { INITIAL_DATA } from '../config';
import { constrainedStrings, id } from './common';
import { modelItemsSchema } from './modelItems';
import { viewsSchema } from './views';
import { validateModel } from './validation';
import { iconsSchema } from './icons';
import { colorsSchema } from './colors';
import { layersSchema } from './layer';
import { connectionsSchema } from './connection';

const modelObjectSchema = z
  .object({
    version: z.string().max(10).optional(),
    // 1.2: optional for embedders; a model without one is 'Untitled'.
    title: constrainedStrings.name.default('Untitled'),
    description: constrainedStrings.description.optional(),
    items: modelItemsSchema,
    views: viewsSchema,
    icons: iconsSchema,
    colors: colorsSchema,
    // lw-052: absent is no layers but the base one.
    layers: layersSchema.optional(),
    // lw-053: absent is none.
    connections: connectionsSchema.optional()
  })
  .strict();

const refineModel = (
  model: z.infer<typeof modelObjectSchema>,
  ctx: z.RefinementCtx
) => {
  const issues = validateModel({ ...INITIAL_DATA, ...model });

  issues.forEach((issue) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: issue.params,
      message: issue.message
    });
  });
};

export const modelSchema = modelObjectSchema.superRefine(refineModel);

// InitialData = Model plus two optional view hints the consumer can pass
// when calling <Reticulyne initialData={...} /> or useReticulyne().loadModel(...).
// `fitToView` recomputes zoom on mount; `view` activates a specific view by
// id. Documented in docs/api.md.
export const initialDataSchema = modelObjectSchema
  .extend({
    fitToView: z.boolean().optional(),
    view: id.optional()
  })
  .strict()
  .superRefine(refineModel);
