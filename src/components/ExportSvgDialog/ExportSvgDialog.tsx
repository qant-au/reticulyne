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
  exportAsVectorSvg,
  exportAsUniversalSvg,
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
  onClose: () => void;
}

export const ExportSvgDialog = ({ onClose }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentView = useUiStateStore((state) => {
    return state.view;
  });
  const [isReady, setIsReady] = useState(false);
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

  // Kept in the store, so reopening the dialog keeps the chosen colour.
  const chosenBackgroundColor = useUiStateStore((state) => {
    return state.exportBackgroundColor;
  });
  const backgroundColor =
    chosenBackgroundColor ??
    createReticulyneTheme(exportTheme).customVars.customPalette.diagramBg;
  const [transparent, setTransparent] = useState(false);

  const effectiveBgColor = transparent ? 'transparent' : backgroundColor;

  // A download is an action: its state is the last failure (null when it
  // worked), and isPending holds the buttons while it runs.
  const [exportError, downloadSvg, isExporting] = useActionState(
    async (_prev: string | null, kind: 'vector' | 'universal') => {
      if (!containerRef.current) return null;
      try {
        const exportSvg =
          kind === 'vector' ? exportAsVectorSvg : exportAsUniversalSvg;
        await exportSvg(containerRef.current, effectiveBgColor, model.title);
        return null;
      } catch (err) {
        return err instanceof Error
          ? err.message
          : `${kind === 'vector' ? 'Vector' : 'Universal'} SVG export failed.`;
      }
    },
    null
  );
  const handleDownload = (kind: 'vector' | 'universal') => {
    startTransition(() => {
      downloadSvg(kind);
    });
  };

  return (
    <AppDialog open onClose={onClose} title="Export as SVG" maxWidth="sm">
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
                ...exportModel,
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
                        onChange={uiStateActions.setExportBackgroundColor}
                      />
                    }
                  />
                )}
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Vector SVG keeps shapes and icons editable, but leaves out text:
              labels and text boxes. Universal SVG includes everything, as one
              picture.
            </Typography>

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
                onClick={() => {
                  handleDownload('vector');
                }}
                disabled={isExporting}
              >
                Download vector SVG
              </Button>
              <Button
                onClick={() => {
                  handleDownload('universal');
                }}
                disabled={isExporting}
              >
                Download universal SVG
              </Button>
            </Stack>
          </>
        )}

        {exportError && <Alert severity="error">{exportError}</Alert>}
      </Stack>
    </AppDialog>
  );
};
