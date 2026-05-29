import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Stack,
  Alert,
  Checkbox,
  FormControlLabel,
  Typography
} from '@mui/material';
import { useShallow } from 'zustand/shallow';
import { useModelStore } from 'src/stores/modelStore';
import {
  exportAsImage,
  downloadFile as downloadFileUtil,
  base64ToBlob,
  generateGenericFilename,
  modelFromModelStore
} from 'src/utils';
import { ModelStore } from 'src/types';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Isoflow } from 'src/Isoflow';
import { Loader } from 'src/components/Loader/Loader';
import { createIsoflowTheme } from 'src/styles/theme';
import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';

interface Props {
  quality?: number;
  onClose: () => void;
}

export const ExportImageDialog = ({ onClose, quality = 1.5 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentView = useUiStateStore((state) => {
    return state.view;
  });
  const [imageData, setImageData] = React.useState<string>();
  const [exportError, setExportError] = useState(false);
  const { getUnprojectedBounds } = useDiagramUtils();
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const exportTheme = useUiStateStore((state) => state.exportTheme);
  const model = useModelStore(
    useShallow((state): Omit<ModelStore, 'actions'> => {
      return modelFromModelStore(state);
    })
  );

  const unprojectedBounds = useMemo(() => {
    return getUnprojectedBounds();
  }, [getUnprojectedBounds]);

  useEffect(() => {
    uiStateActions.setMode({
      type: 'INTERACTIONS_DISABLED',
      showCursor: false
    });
  }, [uiStateActions]);

  const exportImage = useCallback(async () => {
    if (!containerRef.current) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Guard against the dialog unmounting during the 2s debounce:
      // containerRef.current goes to null and `toPng(null)` throws
      // inside html-to-image. exportError would also setState on an
      // unmounted tree.
      if (!containerRef.current) return;
      exportAsImage(containerRef.current)
        .then((data) => {
          return setImageData(data);
        })
        .catch((err) => {
          console.log(err);
          setExportError(true);
        });
    }, 2000);
  }, []);

  // Clear the pending debounced export on unmount so the timer can't
  // fire after the dialog closes. Without this, closing the dialog
  // within 2s of the last onModelUpdated leaked the timer (and would
  // have called setImageData on an unmounted React tree if the
  // exportAsImage step hadn't been gated above).
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  const downloadFile = useCallback(() => {
    if (!imageData) return;

    const data = base64ToBlob(
      imageData.replace('data:image/png;base64,', ''),
      'image/png;charset=utf-8'
    );

    downloadFileUtil(data, generateGenericFilename('png'));
  }, [imageData]);

  const [showGrid, setShowGrid] = useState(false);
  const handleShowGridChange = (checked: boolean) => {
    setShowGrid(checked);
  };

  const [backgroundColor, setBackgroundColor] = useState<string>(
    () => createIsoflowTheme(exportTheme).customVars.customPalette.diagramBg
  );
  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
  };

  useEffect(() => {
    // Invalidate the cached PNG when an input that affects it changes;
    // the user must re-run the async generate step to repopulate it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageData(undefined);
  }, [showGrid, backgroundColor]);

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Export as image</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info">
            <strong>
              Certain browsers may not support exporting images properly.
            </strong>{' '}
            <br />
            For best results, please use the latest version of either Chrome or
            Firefox.
          </Alert>

          {!imageData && (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  overflow: 'hidden'
                }}
              >
                <Box
                  ref={containerRef}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  style={{
                    width: unprojectedBounds.width * quality,
                    height: unprojectedBounds.height * quality
                  }}
                >
                  <Isoflow
                    editorMode="NON_INTERACTIVE"
                    onModelUpdated={exportImage}
                    initialData={{
                      ...model,
                      fitToView: true,
                      view: currentView
                    }}
                    renderer={{
                      showGrid,
                      backgroundColor
                    }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'relative',
                  top: 0,
                  left: 0,
                  width: 500,
                  height: 300,
                  bgcolor: 'common.white'
                }}
              >
                <Loader size={2} />
              </Box>
            </>
          )}
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center'
            }}
          >
            {imageData && (
              <Box
                component="img"
                sx={{
                  maxWidth: '100%'
                }}
                style={{
                  width: unprojectedBounds.width
                }}
                src={imageData}
                alt="preview"
              />
            )}
            <Box sx={{ width: '100%' }}>
              <Box component="fieldset">
                <Typography variant="caption" component="legend">
                  Options
                </Typography>

                <FormControlLabel
                  label="Show grid"
                  control={
                    <Checkbox
                      size="small"
                      checked={showGrid}
                      onChange={(event) => {
                        handleShowGridChange(event.target.checked);
                      }}
                    />
                  }
                />
                <FormControlLabel
                  label="Background color"
                  control={
                    <ColorPicker
                      value={backgroundColor}
                      onChange={handleBackgroundColorChange}
                    />
                  }
                />
              </Box>
            </Box>
            {imageData && (
              <Stack
                sx={{
                  alignItems: 'flex-end',
                  width: '100%'
                }}
              >
                <Stack direction="row" spacing={2}>
                  <Button variant="text" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={downloadFile}>Download as PNG</Button>
                </Stack>
              </Stack>
            )}
          </Stack>

          {exportError && (
            <Alert severity="error">Could not export image</Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
