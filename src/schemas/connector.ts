import { z } from 'zod';
import { coords, id, constrainedStrings } from './common';

export const connectorStyleOptions = ['SOLID', 'DOTTED', 'DASHED'] as const;

export const connectorDirectionOptions = [
  'START_TO_END',
  'END_TO_START',
  'BOTH',
  'NONE'
] as const;

export const anchorSchema = z
  .object({
    id,
    ref: z
      .object({
        item: id,
        anchor: id,
        tile: coords
      })
      .partial()
      .strict()
  })
  .strict();

export const connectorSchema = z
  .object({
    id,
    description: constrainedStrings.description.optional(),
    color: id.optional(),
    width: z.number().optional(),
    style: z.enum(connectorStyleOptions).optional(),
    direction: z.enum(connectorDirectionOptions).optional(),
    anchors: z.array(anchorSchema)
  })
  .strict();
