import { z } from 'zod';
import { id, constrainedStrings } from './common';

// A presentation tour, the steps a host hands to the `tour` prop or
// to useReticulyne().startTour(). Narration is rich text, capped like a
// node description, and is rendered through the same schema-bound viewer.
export const TOUR_MAX_STEPS = 500;

export const tourStepSchema = z
  .object({
    nodeId: id,
    viewId: id.optional(),
    zoom: z.number().finite().optional(),
    title: constrainedStrings.name.optional(),
    narration: constrainedStrings.description.optional()
  })
  .strict();

export const tourSchema = z.array(tourStepSchema).max(TOUR_MAX_STEPS);
