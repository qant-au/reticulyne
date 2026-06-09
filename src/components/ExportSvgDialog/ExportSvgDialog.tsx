import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  Stack,
  Alert,
  FormControlLabel,
  Typography
} from '@mui/material';
import { useShallow } from 'zustand/shallow';
import { useModelStore } from 'src/stores/modelStore';
import {
  exportAsVectorSvg,
  exportAsUniversalSvg,
  modelFromModelStore
} from 'src/utils';
import { ModelStore } from 'src/types';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Reticulyne } from 'src/Reticulyne';
import { Loader } from 'src/components/Loader/Loader';
import { createReticulyneTheme } from 'src/styles/theme';
import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';

interface Props {
  onClose: () => void;
}

export const ExportSvgDialog = ({ onClose }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentView = useUiStateStore((state) => {
    return state.view;
  });
  const [isReady, setIsReady] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { getUnprojectedBounds } = useDiagramUtils();
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const exportTheme = useUiStateStore((state) => {
    return state.exportTheme;
  });
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

  const onModelReady = useCallback(() => {
    setIsReady((prev) => {
      if (prev) return prev;
      return true;
    });
  }, []);

  const [backgroundColor, setBackgroundColor] = useState<string>(() => {
    return createReticulyneTheme(exportTheme).customVars.customPalette
      .diagramBg;
  });
  const [transparent, setTransparent] = useState(false);

  const effectiveBgColor = transparent ? 'transparent' : backgroundColor;

  const handleDownloadVector = useCallback(async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportAsVectorSvg(containerRef.current, effectiveBgColor);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Vector SVG export failed.'
      );
    } finally {
      setIsExporting(false);
    }
  }, [effectiveBgColor]);

  const handleDownloadUniversal = useCallback(async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await exportAsUniversalSvg(containerRef.current, effectiveBgColor);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Universal SVG export failed.'
      );
    } finally {
      setIsExporting(false);
    }
  }, [effectiveBgColor]);

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Export as SVG</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
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
              sx={{ position: 'absolute', top: 0, left: 0 }}
              style={{
                width: unprojectedBounds.width,
                height: unprojectedBounds.height
              }}
            >
              <Reticulyne
                editorMode="NON_INTERACTIVE"
                onModelUpdated={onModelReady}
                initialData={{
                  ...model,
                  fitToView: true,
                  view: currentView
                }}
              />
            </Box>
          </Box>

          {!isReady && (
            <Box
              sx={{
                position: 'relative',
                width: 500,
                height: 300,
                bgcolor: 'background.paper'
              }}
            >
              <Loader size={2} />
            </Box>
          )}

          {isReady && (
            <>
              <Box sx={{ width: '100%' }}>
                <Box component="fieldset">
                  <Typography variant="caption" component="legend">
                    Options
                  </Typography>
                  <FormControlLabel
                    label="Transparent background"
                    control={
                      <input
                        type="checkbox"
                        checked={transparent}
                        onChange={(e) => {
                          return setTransparent(e.target.checked);
                        }}
                        style={{ marginRight: 8 }}
                      />
                    }
                  />
                  {!transparent && (
                    <FormControlLabel
                      label="Background color"
                      control={
                        <ColorPicker
                          value={backgroundColor}
                          onChange={setBackgroundColor}
                        />
                      }
                    />
                  )}
                </Box>
              </Box>

              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'flex-end' }}
              >
                <Button variant="text" onClick={onClose} disabled={isExporting}>
                  Cancel
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleDownloadVector}
                  disabled={isExporting}
                >
                  Download vector SVG
                </Button>
                <Button
                  onClick={handleDownloadUniversal}
                  disabled={isExporting}
                >
                  Download universal SVG
                </Button>
              </Stack>
            </>
          )}

          {exportError && <Alert severity="error">{exportError}</Alert>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
