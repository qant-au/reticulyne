import type { SceneObject } from 'src/vendor/accurona-core';
import { ISO_DRAWINGS } from 'src/vendor/accurona-iso';
import type { Icon } from 'src/types/model';
import { MEDIA } from './media';
import type { CatalogueItem, Medium } from './schema';
import { expandPorts } from './validate';

/** The icon collection the Accurona isometric drawings are filed under. */
export const ACCURONA_ICON_COLLECTION = 'Accurona';

const ACCURONA_ICON_PREFIX = 'accurona-';

/** The Accurona element an item cross-references, if any. */
export const accuronaElement = (item: Pick<CatalogueItem, 'links'>) => {
  return item.links?.find((link) => {
    return link.source === 'accurona';
  })?.ref;
};

/**
 * The isometric drawing of every Accurona element the catalogue
 * cross-references, as icons: pass them in `initialData.icons` so an item
 * with a twin draws with its element's isometric view.
 */
export const accuronaIcons = (): Icon[] => {
  return Object.entries(ISO_DRAWINGS).map(([element, drawing]) => {
    return {
      id: `${ACCURONA_ICON_PREFIX}${element}`,
      name: drawing.name,
      url: `data:image/svg+xml,${encodeURIComponent(drawing.svg)}`,
      collection: ACCURONA_ICON_COLLECTION,
      isIsometric: true
    };
  });
};

/**
 * The icon an item draws with: its own `icon`, else its Accurona twin's
 * isometric view when that drawing is available, else none.
 */
export const catalogueItemIcon = (
  item: Pick<CatalogueItem, 'icon' | 'links'>
): string | undefined => {
  if (item.icon) return item.icon;
  const element = accuronaElement(item);
  return element && element in ISO_DRAWINGS
    ? `${ACCURONA_ICON_PREFIX}${element}`
    : undefined;
};

/**
 * The scene object a placed item becomes. It stands on its own: the ports
 * are expanded and copied (each port's kind is its medium; connector,
 * gender, role, protocols and capabilities go in its props, lists as
 * comma-separated strings), the item is recorded as a 'reticulyne' link,
 * and an Accurona twin becomes the object's `element`, which is what puts
 * the same object on a floor plan.
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
  const element = accuronaElement(item);
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
