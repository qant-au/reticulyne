import type { Icon } from 'src/types/model';
import { DRAWINGS } from './drawings';
import type { IconPack } from './pack';
import { BUILTIN_ICON_COLLECTION, drawingsToIcons } from './drawingIcons';

// Reticulyne's built-in icon pack: every drawing in drawings.ts, with its
// isometric view as the icon's image and its flat schematic as `flatUrl`.

export {
  BUILTIN_ICON_COLLECTION,
  BUILTIN_ICON_PREFIX,
  svgDataUrl,
  drawingIconId
} from './drawingIcons';

/** The built-in icons, one per drawing. */
export const builtinIcons = (): Icon[] => {
  return drawingsToIcons(DRAWINGS);
};

export const BUILTIN_PACK: IconPack = {
  id: 'reticulyne',
  name: BUILTIN_ICON_COLLECTION,
  sourceUrl: 'https://github.com/qant-au/reticulyne/tree/main/src/icons',
  icons: builtinIcons()
};
