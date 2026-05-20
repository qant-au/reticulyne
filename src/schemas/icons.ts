import { z } from 'zod';
import { id, constrainedStrings, SCHEMA_LIMITS } from './common';

export const iconSchema = z
  .object({
    id,
    name: constrainedStrings.name,
    // Cap URL length so a malformed `data:` URL in a third-party
    // diagram can't be megabytes of base64 swallowing memory before
    // any download attempt. ICON_URL_MAX is generous: an 8kb data:
    // URL holds a ~6kb SVG, larger than almost any single-icon glyph
    // in the bundled isopacks.
    url: z.string().max(SCHEMA_LIMITS.ICON_URL_MAX),
    collection: constrainedStrings.name.optional(),
    isIsometric: z.boolean().optional()
  })
  .strict();

export const iconsSchema = z.array(iconSchema).max(SCHEMA_LIMITS.ICONS);
