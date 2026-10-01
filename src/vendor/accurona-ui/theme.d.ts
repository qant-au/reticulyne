import { type PaletteMode, type ThemeOptions } from '@mui/material';
export interface CustomThemeVars {
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
        customVars?: CustomThemeVars;
    }
}
export declare const accuronaVars: (mode?: PaletteMode) => CustomThemeVars;
export declare const accuronaThemeOptions: (mode?: PaletteMode) => ThemeOptions;
export interface AccuronaThemeSettings {
    cssVariables?: boolean;
}
export declare const createAccuronaTheme: (mode?: PaletteMode, { cssVariables }?: AccuronaThemeSettings) => import("@mui/material").Theme;
