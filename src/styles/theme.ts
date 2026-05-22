import { createTheme, PaletteMode, ThemeOptions } from '@mui/material';

interface CustomThemeVars {
  appPadding: {
    x: number;
    y: number;
  };
  toolMenu: {
    height: number;
  };
  customPalette: {
    [key in string]: string;
  };
}

declare module '@mui/material/styles' {
  interface Theme {
    customVars: CustomThemeVars;
  }

  interface ThemeOptions {
    customVars: CustomThemeVars;
  }
}

// Build the customVars block for a given palette mode. Diagram bg
// and the new-node default colour both vary; the structural numbers
// (paddings, toolbar height) are mode-agnostic.
const createIsoflowVars = (mode: PaletteMode): CustomThemeVars => {
  const isDark = mode === 'dark';
  return {
    appPadding: { x: 40, y: 40 },
    toolMenu: { height: 40 },
    customPalette: {
      diagramBg: isDark ? '#1a1d24' : '#f6faff',
      defaultColor: isDark ? '#5b6ab1' : '#a5b8f3'
    }
  };
};

// FEA7-04: legacy `customVars` export — kept as the light-mode value
// for back-compat with any external import. Mode-specific vars now
// live behind `createIsoflowVars(mode)`.
export const customVars: CustomThemeVars = createIsoflowVars('light');

const createShadows = (mode: PaletteMode) => {
  // Dark mode wants deeper, more saturated drop shadows so popovers
  // and floating menus read against the darker canvas. Light mode
  // keeps the historical alpha.
  const isDark = mode === 'dark';
  const alpha = isDark ? 0.5 : 0.25;
  const shadows = Array(25)
    .fill('none')
    .map((_shadow, i) => {
      if (i === 0) return 'none';

      return `0px 10px 20px ${i - 10}px rgba(0,0,0,${alpha})`;
    }) as Required<ThemeOptions>['shadows'];

  return shadows;
};

// FEA7-04: theme factory. Embedders pass `themeMode` on <Isoflow>;
// the resolved mode ('light' | 'dark' — 'auto' is resolved at the
// React layer via prefers-color-scheme) drives palette + customVars.
export const createIsoflowTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const vars = createIsoflowVars(mode);

  return createTheme({
    customVars: vars,
    shadows: createShadows(mode),
    typography: {
      h2: {
        fontSize: '4em',
        fontStyle: 'bold',
        lineHeight: 1.2
      },
      h5: {
        fontSize: '1.3em',
        lineHeight: 1.2
      },
      body1: {
        fontSize: '0.85em',
        lineHeight: 1.2
      },
      body2: {
        fontSize: '0.75em',
        lineHeight: 1.2
      }
    },
    palette: {
      mode,
      secondary: {
        main: '#df004c'
      },
      background: {
        default: isDark ? '#1a1d24' : '#fff',
        paper: isDark ? '#252a33' : '#fff'
      }
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 0,
          variant: 'outlined'
        }
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            // Pre-FEA7 this was hard-coded to white. The dark palette
            // wants the "paper" surface so toolbars read against the
            // canvas instead of glowing.
            backgroundColor: isDark ? '#252a33' : 'white'
          }
        }
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
          disableTouchRipple: true
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          variant: 'contained',
          disableRipple: true,
          disableTouchRipple: true
        },
        styleOverrides: {
          root: {
            textTransform: 'none'
          }
        }
      },
      MuiSvgIcon: {
        defaultProps: {
          color: 'action'
        },
        styleOverrides: {
          root: {
            width: 17,
            height: 17
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined'
        },
        styleOverrides: {
          root: {
            '.MuiInputBase-input': {}
          }
        }
      }
    }
  });
};

// Back-compat named export. Pre-FEA7 consumers may import `theme`
// directly; that import-shape continues to resolve to the
// light-mode theme exactly as before.
export const theme = createIsoflowTheme('light');

// Surfaced for any external consumer that wants the raw config
// without re-running createTheme. Mirrors the pre-FEA7 export.
export const themeConfig = {
  customVars,
  // The factory builds everything else; this re-export is for
  // ergonomic parity with the older API.
  mode: 'light' as PaletteMode
};
