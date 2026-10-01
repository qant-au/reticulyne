import { z } from 'zod';
import { id, constrainedStrings } from './common';

// A logical link between two items, whatever views they are
// placed in. It is the scene format's `connections` entry (Accurona
// docs/scene-format.md, "Connections"), less the props and links
// Reticulyne does not edit; those are kept from the opened scene on save.
// `kind` (the medium id) and `fromPort`/`toPort` attach it to
// the two items' catalogue ports. Reticulyne draws one whose ends are on different views
// (floors) as a transition stub on each floor.
export const connectionSchema = z
  .object({
    id,
    from: id,
    to: id,
    fromPort: id.optional(),
    toPort: id.optional(),
    kind: constrainedStrings.name.optional(),
    description: constrainedStrings.description.optional()
  })
  .strict();

export const CONNECTIONS_MAX = 10_000;

export const connectionsSchema = z.array(connectionSchema).max(CONNECTIONS_MAX);
