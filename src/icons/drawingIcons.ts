import type { Icon } from 'src/types/model';
import type { Drawing } from './drawings';

// How a drawing becomes an icon, without the drawings themselves (1.3 MB of
// SVG in drawings.ts): builtin.ts applies it to every drawing, and the
// read-only viewer loads the drawings only when a diagram needs one.

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

/** The icons for a set of drawings, one per drawing. */
export const drawingsToIcons = (drawings: Record<string, Drawing>): Icon[] => {
  return Object.entries(drawings).map(([id, drawing]) => {
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
