import type { SceneObject } from 'src/vendor/accurona-core';
import { ISO_DRAWINGS } from 'src/vendor/accurona-iso';
import { ITEMS } from 'src/catalogue/items';
import {
  accuronaElement,
  catalogueItemIcon,
  elementIcon
} from 'src/catalogue/place';
import type { CatalogueItem } from 'src/catalogue/schema';

// lw-055: an object on a floor plan, drawn in a diagram. Axonometra writes
// only the object's Accurona `element`; Reticulyne draws it with the
// catalogue item that cross-references that element (its twin), else the
// element's own isometric drawing.

/** The catalogue item that cross-references `element`, if any. */
export const twinOf = (
  element: string | undefined,
  items: CatalogueItem[] = ITEMS
): CatalogueItem | undefined => {
  if (!element) return undefined;
  return items.find((item) => {
    return accuronaElement(item) === element;
  });
};

/** The icon an object draws with: its own, else its element's twin's. */
export const objectIcon = (
  object: Pick<SceneObject, 'icon' | 'element'>,
  items: CatalogueItem[] = ITEMS
): string | undefined => {
  if (object.icon) return object.icon;
  const twin = twinOf(object.element, items);
  if (twin) return catalogueItemIcon(twin);
  return elementIcon(object.element);
};

/** The name an object shows: its own, else its twin's or its element's. */
export const objectName = (
  object: Pick<SceneObject, 'name' | 'element'>,
  items: CatalogueItem[] = ITEMS
): string => {
  if (object.name) return object.name;
  const { element } = object;
  if (!element) return 'Untitled';
  return twinOf(element, items)?.name ?? ISO_DRAWINGS[element]?.name ?? element;
};

/**
 * The icon to give an object in this editor: `objectIcon`, but only when
 * the editor has that icon. A scene may refer only to icons it carries, so
 * an icon the host did not supply (no Accurona drawings) is left off and
 * the node draws with the default block.
 */
export const availableIcon = (
  object: Pick<SceneObject, 'icon' | 'element'>,
  icons: { id: string }[]
): string | undefined => {
  const icon = objectIcon(object);
  return icon !== undefined &&
    icons.some((i) => {
      return i.id === icon;
    })
    ? icon
    : undefined;
};
