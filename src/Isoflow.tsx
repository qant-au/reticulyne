import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { theme } from 'src/styles/theme';
import type { InitialData, IsoflowProps, Model, ModelStore } from 'src/types';
import { setWindowCursor, modelFromModelStore } from 'src/utils';
import { useModelStore, ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { GlobalStyles } from 'src/styles/GlobalStyles';
import { Renderer } from 'src/components/Renderer/Renderer';
import { UiOverlay } from 'src/components/UiOverlay/UiOverlay';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { INITIAL_DATA, MAIN_MENU_OPTIONS } from 'src/config';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { IsoflowErrorBoundary } from 'src/components/IsoflowErrorBoundary/IsoflowErrorBoundary';

const App = ({
  initialData,
  mainMenuOptions = MAIN_MENU_OPTIONS,
  width = '100%',
  height = '100%',
  onModelUpdated,
  onValidationError,
  enableDebugTools = false,
  editorMode = 'EDITABLE',
  renderer
}: IsoflowProps) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const initialDataManager = useInitialDataManager({ onValidationError });
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );

  const { load } = initialDataManager;

  useEffect(() => {
    load({ ...INITIAL_DATA, ...initialData });
  }, [initialData, load]);

  useEffect(() => {
    uiStateActions.setEditorMode(editorMode);
    uiStateActions.setMainMenuOptions(mainMenuOptions);
  }, [editorMode, uiStateActions, mainMenuOptions]);

  useEffect(() => {
    return () => {
      setWindowCursor('default');
    };
  }, []);

  // Stash the latest onModelUpdated in a ref so the model-watching
  // effect below doesn't refire when the consumer passes a fresh inline
  // function on every render. Without this, a high-render-rate host
  // would call back on every parent render even when the model is
  // unchanged.
  const onModelUpdatedRef = useRef(onModelUpdated);
  useEffect(() => {
    onModelUpdatedRef.current = onModelUpdated;
  }, [onModelUpdated]);

  useEffect(() => {
    if (!initialDataManager.isReady) return;
    const cb = onModelUpdatedRef.current;
    if (!cb) return;
    cb(model);
  }, [model, initialDataManager.isReady]);

  useEffect(() => {
    uiStateActions.setEnableDebugTools(enableDebugTools);
  }, [enableDebugTools, uiStateActions]);

  if (!initialDataManager.isReady) return null;

  return (
    <>
      <GlobalStyles />
      <Box
        sx={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <Renderer {...renderer} />
        <UiOverlay />
      </Box>
    </>
  );
};

export const Isoflow = (props: IsoflowProps) => {
  const { onError, errorFallback, ...appProps } = props;
  return (
    <IsoflowErrorBoundary onError={onError} fallback={errorFallback}>
      <ThemeProvider theme={theme}>
        <ModelProvider>
          <SceneProvider>
            <UiStateProvider>
              <App {...appProps} />
            </UiStateProvider>
          </SceneProvider>
        </ModelProvider>
      </ThemeProvider>
    </IsoflowErrorBoundary>
  );
};

const useIsoflow = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });

  const ModelActions = useModelStore((state) => {
    return state.actions;
  });

  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  // Track the current editorMode in a ref so the gated `set` below
  // always sees the latest value, even when the consumer captures the
  // returned Model.set into a long-lived closure.
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const editorModeRef = useRef(editorMode);
  useEffect(() => {
    editorModeRef.current = editorMode;
  }, [editorMode]);

  const initialDataManager = useInitialDataManager();

  const Model = useMemo<ModelStore['actions']>(() => {
    const gatedSet: ModelStore['actions']['set'] = ((
      ...args: Parameters<ModelStore['actions']['set']>
    ) => {
      if (editorModeRef.current !== 'EDITABLE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[isoflow] Refusing model mutation in editorMode="${editorModeRef.current}". ` +
              `Set editorMode="EDITABLE" to allow mutations through useIsoflow().Model.set.`
          );
        }
        return;
      }
      return ModelActions.set(...args);
    }) as ModelStore['actions']['set'];

    return {
      get: ModelActions.get,
      set: gatedSet
    };
  }, [ModelActions]);

  // Documented imperative methods. Prefer these in consumer code; the
  // `Model` and `uiState` escape hatches below stay available for the
  // small number of cases that need direct zustand access.
  const getModel = useCallback((): Model => {
    return modelFromModelStore(ModelActions.get());
  }, [ModelActions]);

  const loadModel = useCallback(
    (data: InitialData): void => {
      if (editorModeRef.current !== 'EDITABLE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[isoflow] Refusing loadModel call in editorMode="${editorModeRef.current}". ` +
              `Set editorMode="EDITABLE" to allow programmatic loads.`
          );
        }
        return;
      }
      initialDataManager.load(data);
    },
    [initialDataManager]
  );

  const setEditorMode = uiStateActions.setEditorMode;
  const setZoom = uiStateActions.setZoom;
  const incrementZoom = uiStateActions.incrementZoom;
  const decrementZoom = uiStateActions.decrementZoom;

  return {
    // Documented imperative API.
    getModel,
    loadModel,
    setEditorMode,
    setZoom,
    incrementZoom,
    decrementZoom,
    rendererEl,
    // Escape hatches. Prefer the documented methods above.
    Model,
    uiState: uiStateActions
  };
};

export { useIsoflow };
export * from 'src/standaloneExports';
export default Isoflow;
