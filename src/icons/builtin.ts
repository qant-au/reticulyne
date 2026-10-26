import type { Icon } from 'src/types/model';
import { DRAWINGS } from './drawings';
import type { IconPack } from './pack';

// Reticulyne's built-in icon pack: every drawing in drawings.ts, with its
// isometric view as the icon's image and its flat schematic as `flatUrl`.

/** The collection the built-in icons are filed under. */
export const BUILTIN_ICON_COLLECTION = 'Reticulyne';

export const BUILTIN_ICON_PREFIX = 'reticulyne-';

export const svgDataUrl = (svg: string) => {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** The icon id of a drawing. */
export const drawingIconId = (drawing: string) => {
  return `${BUILTIN_ICON_PREFIX}${drawing}`;
};

/** The built-in icons, one per drawing. */
export const builtinIcons = (): Icon[] => {
  return Object.entries(DRAWINGS).map(([id, drawing]) => {
    return {
      id: drawingIconId(id),
      name: drawing.name,
      url: svgDataUrl(drawing.iso),
      collection: BUILTIN_ICON_COLLECTION,
      isIsometric: true,
      flatUrl: svgDataUrl(drawing.flat)
    };
  });
};

export const BUILTIN_PACK: IconPack = {
  id: 'reticulyne',
  name: BUILTIN_ICON_COLLECTION,
  sourceUrl: 'https://github.com/qant-au/reticulyne/tree/main/src/icons',
  icons: builtinIcons()
};
