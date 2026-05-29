import { z } from 'zod';
import { id, coords, hexColor } from './common';

export const rectangleSchema = z
  .object({
    id,
    color: id.optional(),
    colorValue: hexColor.optional(),
    outlineColor: hexColor.optional(),
    transparency: z.number().min(0).max(1).optional(),
    zIndex: z.number().int().optional(),
    from: coords,
    to: coords
  })
  .strict();
