import { GlobalStyles as MUIGlobalStyles, useTheme } from '@mui/material';
import 'react-quill-new/dist/quill.snow.css';

// FEA7-04: Quill ships only a light theme (quill.snow.css). When the
// embedder switches the editor to dark mode the toolbar buttons, the
// active-state highlight, the picker dropdowns, and the editor text
// all need overrides so the rich-text controls remain readable on
// the dark canvas. Overrides are scoped under
// `[data-mui-color-scheme="dark"]` so they cost zero in light mode.
export const GlobalStyles = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <MUIGlobalStyles
      styles={{
        div: {
          boxSizing: 'border-box'
        },
        ...(isDark
          ? {
              '.ql-toolbar.ql-snow': {
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`
              },
              '.ql-container.ql-snow': {
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                color: theme.palette.text.primary
              },
              '.ql-editor': {
                color: theme.palette.text.primary
              },
              '.ql-snow .ql-stroke': {
                stroke: theme.palette.text.primary
              },
              '.ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill': {
                fill: theme.palette.text.primary
              },
              '.ql-snow .ql-picker, .ql-snow .ql-picker-label': {
                color: theme.palette.text.primary
              },
              '.ql-snow .ql-picker-options': {
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`
              },
              '.ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke':
                {
                  stroke: theme.palette.primary.main
                },
              '.ql-snow.ql-toolbar button:hover .ql-fill, .ql-snow .ql-toolbar button:hover .ql-fill':
                {
                  fill: theme.palette.primary.main
                }
            }
          : {})
      }}
    />
  );
};
