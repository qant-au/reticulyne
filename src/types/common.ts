export interface Coords {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  from: Coords;
  to: Coords;
}

export const ProjectionOrientationEnum = {
  X: 'X',
  Y: 'Y'
} as const;

// How a diagram view draws its tile grid: 'iso' is the isometric view,
// 'schematic' the flat, Visio-style 2D view of the same tiles (lw-050).
export type Projection = 'iso' | 'schematic';

export type BoundingBox = [Coords, Coords, Coords, Coords];

export type SlimMouseEvent = Pick<
  MouseEvent,
  'clientX' | 'clientY' | 'target' | 'type' | 'preventDefault'
>;

export const EditorModeEnum = {
  NON_INTERACTIVE: 'NON_INTERACTIVE',
  EXPLORABLE_READONLY: 'EXPLORABLE_READONLY',
  EDITABLE: 'EDITABLE'
} as const;

export const MainMenuOptionsEnum = {
  'ACTION.OPEN': 'ACTION.OPEN',
  'ACTION.NEW_FROM_TEMPLATE': 'ACTION.NEW_FROM_TEMPLATE',
  'ACTION.SAVE': 'ACTION.SAVE',
  'ACTION.RENAME': 'ACTION.RENAME',
  'EXPORT.JSON': 'EXPORT.JSON',
  'EXPORT.PNG': 'EXPORT.PNG',
  'EXPORT.PDF': 'EXPORT.PDF',
  'EXPORT.SVG': 'EXPORT.SVG',
  'ACTION.CLEAR_CANVAS': 'ACTION.CLEAR_CANVAS',
  'LINK.GITHUB': 'LINK.GITHUB',
  VERSION: 'VERSION'
} as const;

export type MainMenuOptions = (keyof typeof MainMenuOptionsEnum)[];
