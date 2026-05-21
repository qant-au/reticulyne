import { z } from 'zod';
import { coords, id, constrainedStrings, SCHEMA_LIMITS } from './common';

export const connectorStyleOptions = ['SOLID', 'DOTTED', 'DASHED'] as const;

export const connectorDirectionOptions = [
  'START_TO_END',
  'END_TO_START',
  'BOTH',
  'NONE'
] as const;

// FEA5-05: per-connector glyph picker. The slug at the head of the
// list is the default rendered when a connector omits `glyph`, which
// keeps every existing diagram visually identical post-upgrade.
export const connectorGlyphOptions = [
  'triangle',
  'chevron',
  'double-chevron',
  'circle-solid',
  'circle-outline',
  'diamond',
  'square',
  'dollar',
  'bolt',
  'envelope',
  'person',
  'star'
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
    glyph: z.enum(connectorGlyphOptions).optional(),
    anchors: z.array(anchorSchema).max(SCHEMA_LIMITS.ANCHORS)
  })
  .strict();
