import type { SceneObject } from 'src/core';
import { drawingIconId, svgDataUrl } from 'src/icons/builtin';
import { DRAWINGS } from 'src/icons/drawings';
import type { Icon } from 'src/types/model';
import { ITEMS } from './items';
import { MEDIA } from './media';
import type { CatalogueItem, Medium } from './schema';
import { expandPorts } from './validate';

/** The built-in drawing an item draws with, if any. */
export const catalogueItemDrawing = (
  item: Pick<CatalogueItem, 'drawing'>
): string | undefined => {
  return item.drawing;
};

/** The built-in icon of a drawing, when there is that drawing. */
export const elementIcon = (element: string | undefined) => {
  return element && element in DRAWINGS ? drawingIconId(element) : undefined;
};

/**
 * The icon an item draws with: its own `icon`, else its built-in drawing's
 * icon, else none.
 */
export const catalogueItemIcon = (
  item: Pick<CatalogueItem, 'icon' | 'drawing'>
): string | undefined => {
  if (item.icon) return item.icon;
  return elementIcon(item.drawing);
};

/** The icon collection the 2D schematic symbols are filed under. */
export const SCHEMATIC_ICON_COLLECTION = 'Schematic';

const SCHEMATIC_ICON_PREFIX = 'schematic-';

/**
 * An item's 2D schematic symbol (the flat, Visio-style view) as SVG: its
 * drawing's flat view, else none.
 */
export const catalogueItemSymbol = (
  item: Pick<CatalogueItem, 'id' | 'drawing'>
): string | undefined => {
  if (item.drawing && item.drawing in DRAWINGS) {
    return DRAWINGS[item.drawing].flat;
  }
  return undefined;
};

/**
 * The schematic symbol of each item that has one, as a flat icon with the
 * id `schematic-<item id>`, for a 2D view to draw the items with.
 */
export const schematicIcons = (items: CatalogueItem[] = ITEMS): Icon[] => {
  return items.flatMap((item) => {
    const svg = catalogueItemSymbol(item);
    return svg
      ? [
          {
            id: `${SCHEMATIC_ICON_PREFIX}${item.id}`,
            name: item.name,
            url: svgDataUrl(svg),
            collection: SCHEMATIC_ICON_COLLECTION,
            isIsometric: false
          }
        ]
      : [];
  });
};

/**
 * The scene object a placed item becomes. It stands on its own: the ports
 * are expanded and copied (each port's kind is its medium; connector,
 * gender, role, protocols and capabilities go in its props, lists as
 * comma-separated strings), the item is recorded as a 'reticulyne' link,
 * and its drawing becomes the object's `element`, which is what puts the
 * same object on a floor plan.
 */
export const itemToSceneObject = (
  item: CatalogueItem,
  id: string,
  media: Medium[] = MEDIA
): SceneObject => {
  const byId = new Map(
    media.map((m) => {
      return [m.id, m];
    })
  );
  const ports = expandPorts(item).map((port) => {
    const connector = port.connector ?? byId.get(port.medium)?.connectors[0];
    const props: Record<string, string | number | boolean> = {
      ...(connector ? { connector } : {}),
      ...(port.gender ? { gender: port.gender } : {}),
      ...(port.role ? { role: port.role } : {}),
      ...(port.protocols?.length
        ? { protocols: port.protocols.join(',') }
        : {}),
      ...(port.capabilities?.length
        ? { capabilities: port.capabilities.join(',') }
        : {}),
      ...port.props
    };
    return {
      id: port.id,
      ...(port.name ? { name: port.name } : {}),
      kind: port.medium,
      ...(Object.keys(props).length ? { props } : {})
    };
  });
  // A virtual item never appears on a floor plan, so it has no element.
  const element = item.virtual ? undefined : item.drawing;
  const icon = catalogueItemIcon(item);
  return {
    id,
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    ...(icon ? { icon } : {}),
    ...(element ? { element } : {}),
    ...(item.props ? { props: { ...item.props } } : {}),
    ...(ports.length ? { ports } : {}),
    links: [{ source: 'reticulyne', ref: item.id }]
  };
};
