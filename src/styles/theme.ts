import { PaletteMode, ThemeOptions } from '@mui/material';
import {
  createKitTheme,
  kitThemeOptions,
  kitVars,
  type CustomThemeVars
} from 'src/kit';

// The theme comes from the kit (src/kit/theme.ts). MUI's CSS variables stay
// off: Reticulyne is embedded in other apps, and MUI would write them to the
// host's :root.

// Legacy `customVars` export: the light-mode values, for any external import.
export const customVars: CustomThemeVars = kitVars('light');

// Embedders pass `themeMode` on <Reticulyne>; the resolved mode ('light' |
// 'dark'; 'auto' is resolved at the React layer via prefers-color-scheme)
// drives palette + customVars.
export const createReticulyneTheme = (mode: PaletteMode) => {
  return createKitTheme(mode);
};

// Back-compat named export: the light-mode theme.
export const theme = createReticulyneTheme('light');

// The light-mode ThemeOptions. The picker entry (`src/index.tsx`) spreads it
// into `createTheme` to derive its own outer theme.
export const themeConfig: ThemeOptions = kitThemeOptions('light');
