import { ITEMS } from './items';
import { MEDIA, PROTOCOLS } from './media';
import type { Catalogue } from './schema';

// Reticulyne's catalogue (docs/catalogue.md): the media, protocols and
// items a diagram connects.

/** The built-in catalogue. A host extends it by concatenating its own. */
export const CATALOGUE: Catalogue = {
  media: MEDIA,
  protocols: PROTOCOLS,
  items: ITEMS
};

export * from './schema';
export { expandPorts, validateCatalogue } from './validate';
export type { CatalogueIssue, CatalogueResult, ExpandedPort } from './validate';
export {
  ACCURONA_ICON_COLLECTION,
  accuronaElement,
  accuronaIcons,
  catalogueItemIcon,
  itemToSceneObject
} from './place';
