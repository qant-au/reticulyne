import { diagramBg, type DiagramPaletteMode } from 'src/kit/palette';

// The colours and type the editor's canvas draws with, read from its MUI
// theme (src/kit/theme.ts on MUI's defaults) and written out here, since
// the viewer loads no MUI. A change to the editor's theme needs the same
// change here; the pixel comparison (e2e/viewer-parity.spec.ts) catches a
// mismatch.

export interface ViewerTheme {
  mode: DiagramPaletteMode;
  background: string;
  paper: string;
  defaultBg: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  actionHover: string;
  actionActive: string;
  divider: string;
  primary: string;
  labelBorder: string;
  white: string;
  gridStroke: string;
  gridOpacity: number;
}

export const FONT_FAMILY = '"Roboto", "Helvetica", "Arial", sans-serif';

export const viewerTheme = (mode: DiagramPaletteMode): ViewerTheme => {
  const dark = mode === 'dark';
  return {
    mode,
    background: diagramBg(mode),
    paper: dark ? '#252a33' : '#fff',
    defaultBg: dark ? '#1a1d24' : '#fff',
    textPrimary: dark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
    textSecondary: dark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
    textDisabled: dark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.38)',
    actionHover: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    actionActive: dark ? '#fff' : 'rgba(0, 0, 0, 0.54)',
    divider: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    primary: dark ? '#90caf9' : '#1976d2',
    labelBorder: '#bdbdbd',
    white: '#fff',
    gridStroke: dark ? '#ffffff' : '#000000',
    gridOpacity: dark ? 0.12 : 0.15
  };
};

/** MUI's Typography variants as the editor's theme sets them. */
export const TYPE = {
  body1: { fontSize: '0.85em', lineHeight: '1.2', letterSpacing: '0.00938em' },
  body2: { fontSize: '0.75em', lineHeight: '1.2', letterSpacing: '0.01071em' },
  caption: {
    fontSize: '0.75rem',
    lineHeight: '1.66',
    letterSpacing: '0.03333em'
  }
} as const;
