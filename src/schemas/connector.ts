import { z } from 'zod';
import { coords, id, constrainedStrings, SCHEMA_LIMITS } from './common';

export const connectorStyleOptions = ['SOLID', 'DOTTED', 'DASHED'] as const;

export const connectorDirectionOptions = [
  'START_TO_END',
  'END_TO_START',
  'BOTH',
  'NONE'
] as const;

// FEA7-01: explicit animation-flow direction, decoupled from the
// `direction` field (which governs arrow rendering). When undefined,
// the renderer falls back to deriving flow from `direction` to keep
// older diagrams rendering identically.
export const connectorAnimationFlowOptions = [
  'forward',
  'reverse',
  'both'
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
    // FEA5-06: persistent per-connector animation flag. The runtime
    // is also gated by ReticulyneProps.enableAnimation; setting this to
    // true on a host that hasn't opted in is a no-op visually.
    animated: z.boolean().optional(),
    // FEA7-01: animation-rate multiplier in [0, 1]. 0 = stopped,
    // 1 = today's default speed, intermediate values scale duration
    // inversely. Undefined preserves pre-FEA7 behaviour.
    animationRate: z.number().min(0).max(1).optional(),
    // FEA7-01: explicit flow direction independent of arrow direction.
    // 'both' emits two glyphs travelling in opposite directions.
    // Undefined falls back to the legacy "reverse iff direction ===
    // END_TO_START" rule.
    animationFlow: z.enum(connectorAnimationFlowOptions).optional(),
    anchors: z.array(anchorSchema).max(SCHEMA_LIMITS.ANCHORS)
  })
  .strict();
