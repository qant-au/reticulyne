import { z } from 'zod';
import { id, constrainedStrings, coords, SCHEMA_LIMITS } from './common';
import { rectangleSchema } from './rectangle';
import { connectorSchema } from './connector';
import { textBoxSchema } from './textBox';

export const viewItemSchema = z
  .object({
    id,
    tile: coords,
    labelHeight: z.number().optional()
  })
  .strict();

export const viewSchema = z
  .object({
    id,
    lastUpdated: z.string().datetime().optional(),
    name: constrainedStrings.name,
    description: constrainedStrings.description.optional(),
    items: z.array(viewItemSchema).max(SCHEMA_LIMITS.VIEW_ITEMS),
    rectangles: z
      .array(rectangleSchema)
      .max(SCHEMA_LIMITS.RECTANGLES)
      .optional(),
    connectors: z
      .array(connectorSchema)
      .max(SCHEMA_LIMITS.CONNECTORS)
      .optional(),
    textBoxes: z.array(textBoxSchema).max(SCHEMA_LIMITS.TEXT_BOXES).optional()
  })
  .strict();

export const viewsSchema = z.array(viewSchema).max(SCHEMA_LIMITS.VIEWS);
