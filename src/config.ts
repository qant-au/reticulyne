import {
  Size,
  InitialData,
  MainMenuOptions,
  Icon,
  Connector,
  TextBox,
  ViewItem,
  View,
  Rectangle,
  Colors
} from 'src/types';
import { CoordsUtils } from 'src/utils';
import { customVars } from './styles/theme';

// TODO: This file could do with better organisation and convention for easier reading.
export const UNPROJECTED_TILE_SIZE = 100;

// Bounding-box ratio of a unit tile AFTER the isometric projection
// applied by getIsoMatrix() in src/utils/projection.ts.
//
// The iso matrix is [0.707, -0.409, 0.707, 0.409, 0, -0.816] in CSS
// `matrix(a, b, c, d, e, f)` form. A unit square with corners at
// (0,0), (1,0), (1,1), (0,1) projects to:
//   * (0,0) → (0,         -0.816)
//   * (1,0) → (0.707,     -1.225)
//   * (1,1) → (1.414,     -0.816)
//   * (0,1) → (0.707,     -0.407)
// giving an x-span of 1.414 (2 × |matrix[0]|) and a y-span of 0.818
// (2 × |matrix[3]|).
//
// The values below are those spans rounded up to the nearest
// thousandth — kept as named constants (rather than re-derived per
// render) so PROJECTED_TILE_SIZE doesn't accumulate floating-point
// drift across the many zoom-multiplications that happen each frame.
export const TILE_PROJECTION_MULTIPLIERS: Size = {
  width: 1.415,
  height: 0.819
};
export const PROJECTED_TILE_SIZE = {
  width: UNPROJECTED_TILE_SIZE * TILE_PROJECTION_MULTIPLIERS.width,
  height: UNPROJECTED_TILE_SIZE * TILE_PROJECTION_MULTIPLIERS.height
};

export const DEFAULT_COLOR: Colors[0] = {
  id: '__DEFAULT__',
  value: customVars.customPalette.defaultColor
};

export const DEFAULT_FONT_FAMILY = 'Roboto, Arial, sans-serif';

export const VIEW_DEFAULTS: Required<
  Omit<View, 'id' | 'description' | 'lastUpdated'>
> = {
  name: 'Untitled view',
  items: [],
  connectors: [],
  rectangles: [],
  textBoxes: []
};

export const VIEW_ITEM_DEFAULTS: Required<Omit<ViewItem, 'id' | 'tile'>> = {
  labelHeight: 80
};

export const CONNECTOR_DEFAULTS: Required<Omit<Connector, 'id' | 'color'>> = {
  width: 10,
  description: '',
  anchors: [],
  style: 'SOLID',
  direction: 'START_TO_END',
  glyph: 'triangle',
  animated: false
};

// The boundaries of the search area for the pathfinder algorithm
// is the grid that encompasses the two nodes + the offset below.
export const CONNECTOR_SEARCH_OFFSET = { x: 1, y: 1 };

export const TEXTBOX_DEFAULTS: Required<Omit<TextBox, 'id' | 'tile'>> = {
  orientation: 'X',
  fontSize: 0.6,
  content: 'Text'
};

export const TEXTBOX_PADDING = 0.2;
export const TEXTBOX_FONT_WEIGHT = 'bold';

export const RECTANGLE_DEFAULTS: Required<
  Omit<Rectangle, 'id' | 'from' | 'to' | 'color'>
> = {};

export const ZOOM_INCREMENT = 0.2;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 1;
export const TRANSFORM_ANCHOR_SIZE = 30;
export const TRANSFORM_CONTROLS_COLOR = '#0392ff';
export const INITIAL_DATA: InitialData = {
  title: 'Untitled',
  version: '',
  icons: [],
  colors: [DEFAULT_COLOR],
  items: [],
  views: [],
  fitToView: false
};
export const INITIAL_UI_STATE = {
  zoom: 1,
  scroll: {
    position: CoordsUtils.zero(),
    offset: CoordsUtils.zero()
  }
};
export const INITIAL_SCENE_STATE = {
  connectors: {},
  connectorOverlays: {},
  textBoxes: {}
};
// Default-on menu items. LINK.GITHUB is included because the package.json
// repository URL now points at this fork (https://github.com/qant-au/isoflow),
// so the link goes to the live source — no upstream-leak risk. LINK.DISCORD
// was removed entirely under FEA4-03: the only Discord channel that ever
// lived in this menu was upstream markmanx/isoflow's, and the fork
// deliberately carries no upstream-project branding.
export const MAIN_MENU_OPTIONS: MainMenuOptions = [
  'ACTION.OPEN',
  'EXPORT.JSON',
  'EXPORT.PNG',
  'EXPORT.PDF',
  'ACTION.CLEAR_CANVAS',
  'LINK.GITHUB',
  'VERSION'
];

export const DEFAULT_ICON: Icon = {
  id: 'default',
  name: 'block',
  isIsometric: true,
  url: ''
};

export const DEFAULT_LABEL_HEIGHT = 20;
export const PROJECT_BOUNDING_BOX_PADDING = 3;
export const MARKDOWN_EMPTY_VALUE = '<p><br></p>';
