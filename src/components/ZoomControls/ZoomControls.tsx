import ZoomInIcon from '@mui/icons-material/Add';
import ZoomOutIcon from '@mui/icons-material/Remove';
import FitToScreenIcon from '@mui/icons-material/CropFreeOutlined';
import { Stack, Box, Typography, Divider } from '@mui/material';
import { toPx } from 'src/utils';
import { MAX_ZOOM, MIN_ZOOM } from 'src/config';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { Surface, ToolButton } from 'src/vendor/accurona-ui';

export const ZoomControls = () => {
  const uiStateStoreActions = useUiStateStore((state) => {
    return state.actions;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const { fitToView } = useDiagramUtils();

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
    </Stack>
  );
};
