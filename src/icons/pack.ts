import { z } from 'zod';
import { constrainedStrings, id } from 'src/schemas/common';
import { iconsSchema } from 'src/schemas/icons';
import type { Icon } from 'src/types/model';

// An icon pack: a named, versioned set of icons that is installed as a
// unit. Reticulyne's own library ships as one (src/icons/builtin.ts), and a
// third-party pack has the same shape. Each icon carries its main image
// (`url`, isometric when `isIsometric`) and, optionally, its flat drawing
// (`flatUrl`) for the flat view.

export const iconPackSchema = z
  .object({
    id,
    name: constrainedStrings.name,
    version: z.string().max(40).optional(),
    icons: iconsSchema
  })
  .strict();

export type IconPack = z.infer<typeof iconPackSchema>;

export type IconPackResult =
  { ok: true; pack: IconPack } | { ok: false; errors: string[] };

/** Validates a parsed value as an icon pack. Ids must be unique in it. */
export const validateIconPack = (value: unknown): IconPackResult => {
  const result = iconPackSchema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => {
        return issue.path.length
          ? `${issue.path.join('.')}: ${issue.message}`
          : issue.message;
      })
    };
  }
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const icon of result.data.icons) {
    if (seen.has(icon.id)) duplicates.add(icon.id);
    seen.add(icon.id);
  }
  if (duplicates.size) {
    return {
      ok: false,
      errors: [...duplicates].map((dup) => {
        return `Icon id "${dup}" appears more than once`;
      })
    };
  }
  return { ok: true, pack: result.data };
};

/**
 * A pack's icons, each filed under a collection: its own, else the pack's
 * name, so the icon library groups them by pack.
 */
export const packIcons = (pack: IconPack): Icon[] => {
  return pack.icons.map((icon) => {
    return icon.collection ? icon : { ...icon, collection: pack.name };
  });
};

/**
 * Every pack's icons in one list, for `initialData.icons`. A later pack
 * does not replace an icon an earlier one already gave: the first id wins.
 */
export const flattenPacks = (packs: IconPack[]): Icon[] => {
  const seen = new Set<string>();
  return packs.flatMap(packIcons).filter((icon) => {
    if (seen.has(icon.id)) return false;
    seen.add(icon.id);
    return true;
  });
};

/**
 * `icons`, each one with no flat drawing given the flat drawing of the icon
 * with the same id in `library`, when that has one. A diagram saved before
 * icons carried flat drawings still draws flat this way.
 */
export const fillFlatUrls = (icons: Icon[], library: Icon[]): Icon[] => {
  const flatUrls = new Map(
    library.flatMap((icon) => {
      return icon.flatUrl ? [[icon.id, icon.flatUrl] as const] : [];
    })
  );
  return icons.map((icon) => {
    const flatUrl = icon.flatUrl ? undefined : flatUrls.get(icon.id);
    return flatUrl ? { ...icon, flatUrl } : icon;
  });
};
