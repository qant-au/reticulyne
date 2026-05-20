import { z } from 'zod';
import { id, SCHEMA_LIMITS } from './common';

export const colorSchema = z
  .object({
    id,
    value: z.string().max(7)
  })
  .strict();

export const colorsSchema = z.array(colorSchema).max(SCHEMA_LIMITS.COLORS);
