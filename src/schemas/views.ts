import { z } from 'zod';
import { id, constrainedStrings, coords, SCHEMA_LIMITS } from './common';
import { rectangleSchema } from './rectangle';
import { connectorSchema } from './connector';
import { textBoxSchema } from './textBox';
import { groupSchema } from './group';

export const viewItemSchema = z
  .object({
    id,
    tile: coords,
    labelHeight: z.number().optional(),
    parentGroupId: id.optional(),
    layerId: id.optional(),
    // Locked items are drawn but not selectable on the canvas.
    locked: z.boolean().optional()
  })
  .strict();

export const viewSchema = z
  .object({
    id,
    lastUpdated: z.string().datetime().optional(),
    name: constrainedStrings.name,
    description: constrainedStrings.description.optional(),
    // How the view is drawn: absent is 'iso'. Both kinds share one shape,
    // so a view switches between them without losing anything.
    kind: z.enum(['iso', 'schematic']).optional(),
    items: z.array(viewItemSchema).max(SCHEMA_LIMITS.VIEW_ITEMS),
    rectangles: z
      .array(rectangleSchema)
      .max(SCHEMA_LIMITS.RECTANGLES)
      .optional(),
    connectors: z
      .array(connectorSchema)
      .max(SCHEMA_LIMITS.CONNECTORS)
      .optional(),
    textBoxes: z.array(textBoxSchema).max(SCHEMA_LIMITS.TEXT_BOXES).optional(),
    groups: z.array(groupSchema).max(SCHEMA_LIMITS.GROUPS).optional()
  })
  .strict();

export const viewsSchema = z.array(viewSchema).max(SCHEMA_LIMITS.VIEWS);
