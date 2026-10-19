import { z } from 'zod';
import { MEDIA, PROTOCOLS } from 'src/catalogue/media';
import {
  FAMILIES,
  portTemplateSchema,
  type CatalogueItem
} from 'src/catalogue/schema';
import { validateCatalogue } from 'src/catalogue/validate';
import { constrainedStrings, id, SCHEMA_LIMITS } from 'src/schemas/common';
import { iconSchema } from 'src/schemas/icons';
import type { Icon } from 'src/types/model';

// An icon pack: a named, versioned set of icons that is installed as a
// unit. Reticulyne's own library ships as one (src/icons/builtin.ts), and a
// third-party pack has the same shape. Each icon carries its main image
// (`url`, isometric when `isIsometric`) and, optionally, its flat drawing
// (`flatUrl`) for the flat view.
//
// A pack icon can also carry its connection detail: the ports the device
// has, on the catalogue's media (docs/catalogue.md), with the palette
// section it is filed under. Such an icon is also a catalogue item
// (`packCatalogueItems`), so a third-party pack brings its devices with
// their ports. The detail stays in the pack; the icon a diagram stores is
// the plain icon record.

export const packIconSchema = iconSchema.extend({
  family: z.enum(FAMILIES).optional(),
  description: z.string().max(2_000).optional(),
  ports: z.array(portTemplateSchema).optional(),
  props: z
    .record(
      z.string().min(1).max(200),
      z.union([z.string().max(2_000), z.number(), z.boolean()])
    )
    .optional()
});

export const iconPackSchema = z
  .object({
    id,
    name: constrainedStrings.name,
    version: z.string().max(40).optional(),
    icons: z.array(packIconSchema).max(SCHEMA_LIMITS.ICONS)
  })
  .strict();

export type PackIcon = z.infer<typeof packIconSchema>;
export type IconPack = z.infer<typeof iconPackSchema>;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The catalogue items a pack brings: one for each icon that has ports,
 * drawing with that icon. The item's id is the icon's id.
 */
export const packCatalogueItems = (pack: IconPack): CatalogueItem[] => {
  return pack.icons.flatMap((icon) => {
    if (!icon.ports) return [];
    return [
      {
        id: icon.id,
        name: icon.name,
        family: icon.family ?? 'ethernet',
        ...(icon.description ? { description: icon.description } : {}),
        icon: icon.id,
        ports: icon.ports,
        ...(icon.props ? { props: icon.props } : {})
      }
    ];
  });
};

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
  // Connection detail follows the catalogue's rules, on its media.
  const errors: string[] = [];
  for (const icon of result.data.icons) {
    if (!icon.ports) continue;
    if (!KEBAB.test(icon.id)) {
      errors.push(
        `icons.${icon.id}: an icon with ports needs a kebab-case id (a-z 0-9 and -)`
      );
    }
    if (!icon.family) {
      errors.push(`icons.${icon.id}: an icon with ports needs a family`);
    }
  }
  if (errors.length) return { ok: false, errors };
  const items = packCatalogueItems(result.data);
  if (items.length) {
    const checked = validateCatalogue({
      media: MEDIA,
      protocols: PROTOCOLS,
      items
    });
    if (!checked.ok) {
      return {
        ok: false,
        errors: checked.issues.map((issue) => {
          return `${issue.path.replace(/^items\./, 'icons.')}: ${issue.message}`;
        })
      };
    }
  }
  return { ok: true, pack: result.data };
};

/**
 * A pack's icons, each filed under a collection: its own, else the pack's
 * id, so the icon library groups them by pack and `iconCollections` can
 * allow or deny a pack by its id.
 */
export const packIcons = (pack: IconPack): Icon[] => {
  return pack.icons.map((packIcon) => {
    const { family, description, ports, props, ...icon } = packIcon;
    void family;
    void description;
    void ports;
    void props;
    return icon.collection ? icon : { ...icon, collection: pack.id };
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
