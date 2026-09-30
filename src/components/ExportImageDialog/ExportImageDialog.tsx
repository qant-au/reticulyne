import {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useActionState,
  startTransition
} from 'react';
import {
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
  filenameForTitle,
  hasRedactedContent,
  modelForExport,
  modelFromModelStore
} from 'src/utils';
import { ModelStore } from 'src/types';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Reticulyne } from 'src/Reticulyne';
import { Loader } from 'src/components/Loader/Loader';
import { createReticulyneTheme } from 'src/styles/theme';
import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';
import { AppDialog } from 'src/vendor/accurona-ui';

interface Props {
  quality?: number;
  onClose: () => void;
}

// The PNG, once rendered, or the failure to render it.
interface ExportState {
  imageData?: string;
  error: boolean;
}

// Render the PNG from the hidden editor, or drop it because an option
// changed. As actions they run in order, so a render still in flight
// when an option changes cannot land after the reset.
type ExportAction = { type: 'render'; el: HTMLDivElement } | { type: 'reset' };

const exportReducer = async (
  _prev: ExportState,
  action: ExportAction
): Promise<ExportState> => {
  if (action.type === 'reset') return { error: false };
  try {
    return { imageData: await exportAsImage(action.el), error: false };
  } catch (err) {
    console.error('[reticulyne] image export failed:', err);
    return { error: true };
  }
};

export const ExportImageDialog = ({ onClose, quality = 1.5 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentView = useUiStateStore((state) => {
    return state.view;
  });
  const [{ imageData, error: exportError }, dispatchExport] = useActionState(
    exportReducer,
    { error: false }
  );
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

  // lw-052: hidden layers are left out, and the Redacted layer unless
  // the export includes it.
  const [includeRedacted, setIncludeRedacted] = useState(false);
  const hasRedacted = useMemo(() => {
    return hasRedactedContent(model);
  }, [model]);
  const exportModel = useMemo(() => {
    return modelForExport(model, { includeRedacted });
  }, [model, includeRedacted]);

  const unprojectedBounds = useMemo(() => {
    return getUnprojectedBounds();
  }, [getUnprojectedBounds]);
  // The preview's box, and the loader's while it renders: the diagram's
  // width and aspect, never wider than the dialog.
  const previewSize = useMemo(() => {
    return {
      width: unprojectedBounds.width,
      aspectRatio: `${unprojectedBounds.width} / ${unprojectedBounds.height}`
    };
  }, [unprojectedBounds]);

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
      // inside html-to-image.
      const el = containerRef.current;
      if (!el) return;
      startTransition(() => {
        dispatchExport({ type: 'render', el });
      });
    }, 2000);
  }, [dispatchExport]);

  // Clear the pending debounced export on unmount so the timer can't
  // fire after the dialog closes. Without this, closing the dialog
  // within 2s of the last onModelUpdated leaked the timer.
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

    downloadFileUtil(data, filenameForTitle(model.title, 'png'));
  }, [imageData, model.title]);

  const [showGrid, setShowGrid] = useState(false);
  const handleShowGridChange = (checked: boolean) => {
    setShowGrid(checked);
  };

  // Kept in the store, so reopening the dialog keeps the chosen colour
  // (sweep 2026-09-30: it went back to the theme's each time).
  const chosenBackgroundColor = useUiStateStore((state) => {
    return state.exportBackgroundColor;
  });
  const backgroundColor =
    chosenBackgroundColor ??
    createReticulyneTheme(exportTheme).customVars.customPalette.diagramBg;
  const handleBackgroundColorChange = (color: string) => {
    uiStateActions.setExportBackgroundColor(color);
  };
  // As the SVG export offers: a PNG with no background, for placing
  // over a slide or a page.
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    // Invalidate the cached PNG when an input that affects it changes;
    // the hidden editor remounts and renders it again.
    startTransition(() => {
      dispatchExport({ type: 'reset' });
    });
  }, [dispatchExport, showGrid, backgroundColor, transparent, includeRedacted]);

  return (
    <AppDialog open onClose={onClose} title="Export as image" maxWidth="sm">
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
                <Reticulyne
                  editorMode="NON_INTERACTIVE"
                  onModelUpdated={exportImage}
                  initialData={{
                    ...exportModel,
                    fitToView: true,
                    view: currentView
                  }}
                  renderer={{
                    showGrid,
                    backgroundColor: transparent
                      ? 'transparent'
                      : backgroundColor
                  }}
                />
              </Box>
            </Box>
            {/* The preview's own size, so the dialog does not jump when the
                preview replaces it (it moved 36px, sweep 2026-09-30). */}
            <Box
              data-testid="export-image-loading"
              sx={{
                position: 'relative',
                alignSelf: 'center',
                maxWidth: '100%',
                bgcolor: 'background.paper'
              }}
              style={previewSize}
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
              style={previewSize}
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
                label="Transparent background"
                control={
                  <Checkbox
                    size="small"
                    checked={transparent}
                    onChange={(event) => {
                      setTransparent(event.target.checked);
                    }}
                  />
                }
              />
              {hasRedacted && (
                <FormControlLabel
                  label="Include redacted content"
                  control={
                    <Checkbox
                      size="small"
                      checked={includeRedacted}
                      onChange={(event) => {
                        setIncludeRedacted(event.target.checked);
                      }}
                    />
                  }
                />
              )}
              {!transparent && (
                <FormControlLabel
                  label="Background color"
                  control={
                    <ColorPicker
                      label="Background color"
                      value={backgroundColor}
                      onChange={handleBackgroundColorChange}
                    />
                  }
                />
              )}
            </Box>
          </Box>
          {/* Always there, so the dialog keeps its height; Download waits
              for the preview. */}
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
              <Button onClick={downloadFile} disabled={!imageData}>
                Download as PNG
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {exportError && <Alert severity="error">Could not export image</Alert>}
      </Stack>
    </AppDialog>
  );
};
