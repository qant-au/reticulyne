import { GlobalStyles as MUIGlobalStyles, useTheme } from '@mui/material';

// The rich-text editor (TipTap/ProseMirror) needs no base stylesheet — the
// editable frame is styled locally in MarkdownEditor.tsx. Here we only theme
// the shared editor/label surfaces: links pick up the palette, and in dark
// mode the text stays readable on the dark canvas (FEA7-04). Rules are scoped
// to the ProseMirror editor and the read-only label view, so they cost
// nothing elsewhere.
export const GlobalStyles = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <MUIGlobalStyles
      styles={{
        div: {
          boxSizing: 'border-box'
        },
        '.ProseMirror a, .reticulyne-markdown-view a': {
          color: theme.palette.primary.main
        },
        ...(isDark
          ? {
              '.ProseMirror, .reticulyne-markdown-view': {
                color: theme.palette.text.primary
              }
            }
          : {})
      }}
    />
  );
};
