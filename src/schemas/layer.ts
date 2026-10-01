import { z } from 'zod';
import { id, constrainedStrings } from './common';

// Named layers that cut across views and groups. An item names
// its layer with `layerId`; an item without one is on the base layer,
// which always exists and is never listed. Follows the scene format's
// `layers` and `layer` (Accurona docs/scene-format.md, "Layers").

/**
 * The reserved layer: its items are shown in the editor and left out of
 * every export unless the export opts in. Never listed in `layers`.
 */
export const REDACTED_LAYER_ID = 'redacted';

export const layerSchema = z
  .object({
    id,
    name: constrainedStrings.name,
    // Absent is visible.
    visible: z.boolean().optional()
  })
  .strict();

export const LAYERS_MAX = 100;

export const layersSchema = z.array(layerSchema).max(LAYERS_MAX);
