import { PaletteMode, ThemeOptions } from '@mui/material';
import {
  createLineworkTheme,
  lineworkThemeOptions,
  lineworkVars,
  type CustomThemeVars
} from 'src/vendor/accurona-ui';

// The theme is Accurona's shared one (decision D12), so Reticulyne and
// Axonometra look the same. MUI's CSS variables stay off: Reticulyne is
// embedded in other apps, and MUI would write them to the host's :root.

// Legacy `customVars` export: the light-mode values, for any external import.
export const customVars: CustomThemeVars = lineworkVars('light');

// Embedders pass `themeMode` on <Reticulyne>; the resolved mode ('light' |
// 'dark'; 'auto' is resolved at the React layer via prefers-color-scheme)
// drives palette + customVars.
export const createReticulyneTheme = (mode: PaletteMode) => {
  return createLineworkTheme(mode);
};

// Back-compat named export: the light-mode theme.
export const theme = createReticulyneTheme('light');

// The light-mode ThemeOptions. The picker entry (`src/index.tsx`) spreads it
// into `createTheme` to derive its own outer theme.
export const themeConfig: ThemeOptions = lineworkThemeOptions('light');
