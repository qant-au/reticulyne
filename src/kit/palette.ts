// The diagram's own colours, with no MUI: the theme (theme.ts) reads them,
// and so do src/config.ts and the read-only viewer, which load no MUI.

export type DiagramPaletteMode = 'light' | 'dark';

/** The canvas background. */
export const diagramBg = (mode: DiagramPaletteMode = 'light') => {
  return mode === 'dark' ? '#1a1d24' : '#f6faff';
};

/** The colour an object, zone or link gets when none is chosen. */
export const defaultColor = (mode: DiagramPaletteMode = 'light') => {
  return mode === 'dark' ? '#5b6ab1' : '#a5b8f3';
};

/** The default colour as saved in a diagram (the light-mode value). */
export const DEFAULT_COLOR_VALUE = defaultColor('light');
