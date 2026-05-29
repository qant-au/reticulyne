import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { createIsoflowTheme } from 'src/styles/theme';
import { useResolvedThemeMode } from 'src/hooks/useResolvedThemeMode';
import type {
  Connector as ConnectorType,
  InitialData,
  IsoflowProps,
  Model,
  ModelStore
} from 'src/types';
import { setWindowCursor, modelFromModelStore } from 'src/utils';
import { useModelStore, ModelProvider } from 'src/stores/modelStore';
import { SceneProvider, useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import * as reducers from 'src/stores/reducers';
import { CONNECTOR_DEFAULTS } from 'src/config';
import { HistoryProvider } from 'src/stores/historyStore';
import { GlobalStyles } from 'src/styles/GlobalStyles';
import { Renderer } from 'src/components/Renderer/Renderer';
import { UiOverlay } from 'src/components/UiOverlay/UiOverlay';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { DEFAULT_COLOR, INITIAL_DATA, MAIN_MENU_OPTIONS } from 'src/config';
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
  enableAnimation = false,
  editorMode = 'EDITABLE',
  renderer,
  showTitleBar,
  iconCollections,
  onSave,
  nodeIndicatorComponent,
  connectorIndicatorComponent,
  exportTheme = 'light',
  children
}: IsoflowProps) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const initialDataManager = useInitialDataManager({
    onValidationError,
    iconCollections
  });
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );

  const { load, iconCollectionsKey } = initialDataManager;

  // Memoise the merged `{ ...INITIAL_DATA, ...initialData }` so its
  // reference is stable whenever the consumer's `initialData` ref is
  // stable. Previously this merge happened inline inside the effect
  // body, producing a fresh object on every effect run and defeating the
  // reference-equality dedupe guard inside `useInitialDataManager.load`
  // — every consumer re-render would re-seed the entire model store and
  // wipe any unsaved items the user had just placed.
  const mergedInitialData = useMemo(() => {
    return { ...INITIAL_DATA, ...initialData };
  }, [initialData]);

  useEffect(() => {
    load(mergedInitialData);
    // `iconCollectionsKey` is included so a runtime change to the
    // `iconCollections` prop retriggers the load pipeline and the
    // filter actually re-applies. Without it, the dedupe guard inside
    // useInitialDataManager short-circuits on the same `initialData`
    // reference (BUG5-06).
  }, [mergedInitialData, load, iconCollectionsKey]);

  useEffect(() => {
    uiStateActions.setEditorMode(editorMode);
    uiStateActions.setMainMenuOptions(mainMenuOptions);
  }, [editorMode, uiStateActions, mainMenuOptions]);

  useEffect(() => {
    uiStateActions.setShowTitleBar(showTitleBar);
  }, [showTitleBar, uiStateActions]);

  // Stash the host's onSave callback on the UI-state store so the
  // MainMenu's "Save" entry (FEA5-03) can read it without prop-
  // drilling. Identity churn is acceptable here — the only subscriber
  // is the MainMenu, and only the entry's render branch (`onSave
  // !== undefined`) is reactive in practice.
  useEffect(() => {
    uiStateActions.setOnSave(onSave);
  }, [onSave, uiStateActions]);

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

  useEffect(() => {
    uiStateActions.setEnableAnimation(enableAnimation);
  }, [enableAnimation, uiStateActions]);

  useEffect(() => {
    uiStateActions.setNodeIndicatorComponent(nodeIndicatorComponent);
  }, [nodeIndicatorComponent, uiStateActions]);

  useEffect(() => {
    uiStateActions.setConnectorIndicatorComponent(connectorIndicatorComponent);
  }, [connectorIndicatorComponent, uiStateActions]);

  useEffect(() => {
    uiStateActions.setExportTheme(exportTheme);
  }, [exportTheme, uiStateActions]);

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
        {children}
      </Box>
    </>
  );
};

export const Isoflow = (props: IsoflowProps) => {
  const {
    onError,
    errorFallback,
    themeMode = 'auto',
    exportTheme = 'light',
    ...appProps
  } = props;
  // FEA7-04: resolve 'auto' against prefers-color-scheme, then
  // memoise the createTheme() result so MUI's deep-merge runs once
  // per mode change instead of every parent render.
  const resolvedMode = useResolvedThemeMode(themeMode);
  const theme = useMemo(() => {
    return createIsoflowTheme(resolvedMode);
  }, [resolvedMode]);
  const modeAwareInitialData = useMemo(() => {
    if (appProps.initialData) return appProps.initialData;
    return {
      ...INITIAL_DATA,
      colors: [
        { ...DEFAULT_COLOR, value: theme.customVars.customPalette.defaultColor }
      ]
    };
    // `theme` is intentionally omitted from deps. The default colour is a
    // one-time seed value — including `theme` re-seeds the model store on
    // every live auto mode switch, wiping user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appProps.initialData]);
  return (
    <IsoflowErrorBoundary onError={onError} fallback={errorFallback}>
      <ThemeProvider theme={theme}>
        <ModelProvider>
          <SceneProvider>
            <UiStateProvider>
              <HistoryProvider>
                <App
                  {...appProps}
                  initialData={modeAwareInitialData}
                  exportTheme={exportTheme}
                />
              </HistoryProvider>
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

  // FEA5-07: imperative Connector namespace — gives a live-data host
  // (poller, websocket, simulation) direct control over connector
  // visuals without re-seeding the model or re-rendering the editor
  // tree. `get` returns the merged connector. `update` is the
  // editor-bypass write path: it bypasses the history stack so a
  // live driver doesn't pollute Ctrl+Z. `pulse` writes to the
  // runtime sceneStore overlay and never touches the model.
  //
  // Implementation note: this reads from the lower-level stores
  // (model/scene/ui/history) at call time rather than going
  // through `useScene()`. `useScene()` calls
  // `getItemByIdOrThrow(views, currentViewId)` synchronously, which
  // throws when a host calls useIsoflow before a view is loaded.
  // Going through `.actions.get()` means the lookup only runs at
  // mutation time — and at that point the host is responsible for
  // ensuring the view exists.
  const sceneStoreActions = useSceneStore((state) => {
    return state.actions;
  });
  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  const historyActions = useHistoryStore((state) => {
    return state.actions;
  });
  const Connector = useMemo(() => {
    type Patch = Partial<
      Pick<
        ConnectorType,
        'color' | 'width' | 'style' | 'direction' | 'glyph' | 'animated'
      >
    >;

    const get = (id: string): ConnectorType | undefined => {
      const model = ModelActions.get();
      for (const view of model.views) {
        const found = view.connectors?.find((c) => {
          return c.id === id;
        });
        if (found) {
          return { ...CONNECTOR_DEFAULTS, ...found };
        }
      }
      return undefined;
    };

    const update = (id: string, patch: Patch) => {
      if (editorModeRef.current === 'NON_INTERACTIVE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[isoflow] Refusing Connector.update in editorMode="${editorModeRef.current}".`
          );
        }
        return;
      }
      const state = {
        model: ModelActions.get(),
        scene: sceneStoreActions.get()
      };
      const newState = reducers.view({
        action: 'UPDATE_CONNECTOR',
        payload: { id, ...patch },
        ctx: { viewId: currentViewId, state }
      });
      // Bypass undo/redo recording — host-driven imperative writes
      // shouldn't fill the Ctrl+Z stack with live-data churn.
      historyActions.setIsApplying(true);
      try {
        ModelActions.set(newState.model);
        sceneStoreActions.set(newState.scene);
      } finally {
        historyActions.setIsApplying(false);
      }
    };

    const pulse = (
      id: string,
      opts?: { durationMs?: number; glyph?: ConnectorType['glyph'] }
    ) => {
      const durationMs = opts?.durationMs ?? 1500;
      const expiresAt = Date.now() + durationMs;
      const current = sceneStoreActions.get();
      sceneStoreActions.set({
        connectorOverlays: {
          ...current.connectorOverlays,
          [id]: {
            pulseExpiresAt: expiresAt,
            pulseDurationMs: durationMs,
            pulseGlyph: opts?.glyph
          }
        }
      });
      setTimeout(() => {
        const next = sceneStoreActions.get();
        const overlay = next.connectorOverlays[id];
        if (overlay?.pulseExpiresAt === expiresAt) {
          const rest = { ...next.connectorOverlays };
          delete rest[id];
          sceneStoreActions.set({ connectorOverlays: rest });
        }
      }, durationMs);
    };

    return { get, update, pulse };
  }, [ModelActions, sceneStoreActions, historyActions, currentViewId]);

  return {
    // Documented imperative API.
    getModel,
    loadModel,
    setEditorMode,
    setZoom,
    incrementZoom,
    decrementZoom,
    rendererEl,
    Connector,
    // Escape hatches. Prefer the documented methods above.
    Model,
    uiState: uiStateActions
  };
};

export { useIsoflow };
export * from 'src/standaloneExports';
export default Isoflow;
