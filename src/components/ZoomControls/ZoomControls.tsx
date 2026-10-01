import ZoomInIcon from '@mui/icons-material/Add';
import ZoomOutIcon from '@mui/icons-material/Remove';
import FitToScreenIcon from '@mui/icons-material/CropFreeOutlined';
import { Stack, Box, Typography, Divider } from '@mui/material';
import { toPx } from 'src/utils';
import { MAX_ZOOM, MIN_ZOOM } from 'src/config';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { Surface, ToolButton } from 'src/vendor/accurona-ui';
import { ViewKindToggle } from './ViewKindToggle';
import { LayersButton } from './LayersButton';

// `compact` (a phone) leaves out the zoom percentage: with it, the row ran
// past the right edge and the Layers and ? buttons were cut off.
export const ZoomControls = ({ compact = false }: { compact?: boolean }) => {
  const uiStateStoreActions = useUiStateStore((state) => {
    return state.actions;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const { fitToView } = useDiagramUtils();
  // Switching the drawing, and the layers, change the saved
  // diagram, so only an editable one offers them.
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });

  return (
    <Stack direction="row" spacing={1}>
      <Surface>
        <Stack direction="row">
          <ToolButton
            name="Zoom out (-)"
            icon={<ZoomOutIcon />}
            onClick={uiStateStoreActions.decrementZoom}
            disabled={zoom <= MIN_ZOOM}
          />
          <Divider orientation="vertical" flexItem />
          {!compact && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minWidth: toPx(60)
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary'
                  }}
                >
                  {Math.round(zoom * 100)}%
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
            </>
          )}
          <ToolButton
            name="Zoom in (+)"
            icon={<ZoomInIcon />}
            onClick={uiStateStoreActions.incrementZoom}
            disabled={zoom >= MAX_ZOOM}
          />
        </Stack>
      </Surface>
      <Surface>
        <ToolButton
          name="Fit to view (F)"
          icon={<FitToScreenIcon />}
          onClick={fitToView}
        />
      </Surface>
      {editable && <ViewKindToggle />}
      {editable && <LayersButton />}
    </Stack>
  );
};
