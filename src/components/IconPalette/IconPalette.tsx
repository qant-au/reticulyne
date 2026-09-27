import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { IconSelectionControls } from 'src/components/ItemControls/IconSelectionControls/IconSelectionControls';

// ROADMAP 2.11: the icon library as a persistent panel on the right,
// opened from the toolbar and left open while you work. Press an icon and
// drag it onto a tile (the same ghost and drop as the add-item picker), or
// click it and then click the canvas. Editable diagrams only.
export const IconPalette = () => {
  const open = useUiStateStore((state) => {
    return state.iconPaletteOpen;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  if (!open || editorMode !== 'EDITABLE') return null;

  return (
    <Box
      data-testid="icon-palette"
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        // Stops above the mini-map (150 px tall at 16 px from the bottom).
        bottom: 190,
        width: 320,
        maxWidth: 'calc(100% - 32px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        overflow: 'hidden',
        '& > div:last-of-type': { flex: 1, minHeight: 0, overflowY: 'auto' }
      }}
    >
      <IconButton
        aria-label="Close icon library"
        size="small"
        onClick={() => {
          uiStateActions.setIconPaletteOpen(false);
        }}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <IconSelectionControls title="Icon library" armFromAnyMode />
    </Box>
  );
};
