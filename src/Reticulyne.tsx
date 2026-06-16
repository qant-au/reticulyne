import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { createReticulyneTheme } from 'src/styles/theme';
import { useResolvedThemeMode } from 'src/hooks/useResolvedThemeMode';
import type {
  Connector as ConnectorType,
  InitialData,
  ReticulyneProps,
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
import { initialDataSchema } from 'src/schemas/model';
import { ReticulyneErrorBoundary } from 'src/components/ReticulyneErrorBoundary/ReticulyneErrorBoundary';

const App = ({
  initialData,
  mainMenuOptions = MAIN_MENU_OPTIONS,
  width = '100%',
  height = '100%',
  onModelUpdated,
  onValidationError,
  enableDebugTools = false,
  enableAnimation = false,
  enableGlobalDragHandlers = true,
  enableGlobalKeyboardShortcuts = true,
  editorMode = 'EDITABLE',
  renderer,
  showTitleBar,
  iconCollections,
  onSave,
  nodeIndicatorComponent,
  connectorIndicatorComponent,
  highlightedItemId,
  exportTheme = 'light',
  children
}: ReticulyneProps) => {
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

  // SEC-02: mirror onValidationError onto the store too, so the
  // imperative useReticulyne().Model.set (built in a separate hook scope)
  // can route merge-then-validate failures through the same callback.
  useEffect(() => {
    uiStateActions.setOnValidationError(onValidationError);
  }, [onValidationError, uiStateActions]);

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
    uiStateActions.setHighlightedItemId(highlightedItemId);
  }, [highlightedItemId, uiStateActions]);

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
        <Renderer
          {...renderer}
          enableGlobalDragHandlers={enableGlobalDragHandlers}
          enableGlobalKeyboardShortcuts={enableGlobalKeyboardShortcuts}
        />
        <UiOverlay />
        {children}
      </Box>
    </>
  );
};

export const Reticulyne = (props: ReticulyneProps) => {
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
    return createReticulyneTheme(resolvedMode);
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
    <ReticulyneErrorBoundary onError={onError} fallback={errorFallback}>
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
    </ReticulyneErrorBoundary>
  );
};

const useReticulyne = () => {
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

  // SEC-02: read the host's onValidationError off the store (mirrored
  // there by App) and keep it in a ref, mirroring editorModeRef, so the
  // long-lived gatedSet closure always sees the latest callback.
  const onValidationError = useUiStateStore((state) => {
    return state.onValidationError;
  });
  const onValidationErrorRef = useRef(onValidationError);
  useEffect(() => {
    onValidationErrorRef.current = onValidationError;
  }, [onValidationError]);

  const initialDataManager = useInitialDataManager();

  const Model = useMemo<ModelStore['actions']>(() => {
    const gatedSet: ModelStore['actions']['set'] = ((
      ...args: Parameters<ModelStore['actions']['set']>
    ) => {
      if (editorModeRef.current !== 'EDITABLE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[reticulyne] Refusing model mutation in editorMode="${editorModeRef.current}". ` +
              `Set editorMode="EDITABLE" to allow mutations through useReticulyne().Model.set.`
          );
        }
        return;
      }

      // SEC-02: merge-then-validate. Model.set is a zustand setState, so
      // the payload may be a partial object or an updater function, plus
      // an optional `replace` flag. Resolve it against the current store,
      // strip the runtime `actions` key (modelFromModelStore), and run the
      // resulting Model through the same schema loadModel uses. Apply only
      // if it passes; otherwise route to onValidationError (the same path
      // useInitialDataManager uses) without mutating state.
      const [partial, replace] = args as [
        (
          | Partial<ModelStore>
          | ((state: ModelStore) => Partial<ModelStore> | ModelStore)
        ),
        boolean | undefined
      ];
      const current = ModelActions.get();
      const resolvedPartial =
        typeof partial === 'function' ? partial(current) : partial;
      const candidateStore = replace
        ? (resolvedPartial as ModelStore)
        : ({ ...current, ...resolvedPartial } as ModelStore);
      const candidateModel = modelFromModelStore(candidateStore);

      const result = initialDataSchema.safeParse(candidateModel);
      if (!result.success) {
        const cb = onValidationErrorRef.current;
        if (cb) {
          cb(result.error.issues);
        } else {
          console.error(
            '[reticulyne] Model.set rejected — payload failed schema validation:',
            result.error.issues
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
            `[reticulyne] Refusing loadModel call in editorMode="${editorModeRef.current}". ` +
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
  // throws when a host calls useReticulyne before a view is loaded.
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
            `[reticulyne] Refusing Connector.update in editorMode="${editorModeRef.current}".`
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

    return {
      /**
       * Return the connector with the given id, with style defaults
       * merged in, or `undefined` if no connector matches across any view.
       */
      get,
      /**
       * Imperatively patch a connector's visual properties. Bypasses the
       * undo/redo history stack, so a live-data driver won't pollute
       * Ctrl+Z. No-op (warns in dev) when `editorMode` is
       * `NON_INTERACTIVE`.
       */
      update,
      /**
       * Fire a one-shot visual pulse on a connector. Writes to the runtime
       * scene overlay only — never touches the model. A new pulse on the
       * same id supersedes any in-flight pulse. Default duration 1500ms.
       */
      pulse
    };
  }, [ModelActions, sceneStoreActions, historyActions, currentViewId]);

  return {
    // Documented imperative API.
    /** Return a snapshot of the current model. */
    getModel,
    /**
     * Replace the editor's contents with a new validated model. No-op
     * (warns in dev) unless `editorMode` is `EDITABLE`; set
     * `editorMode="EDITABLE"` before calling to allow programmatic loads.
     */
    loadModel,
    /**
     * Switch the editor mode (`EDITABLE` | `EXPLORABLE` |
     * `NON_INTERACTIVE`). Gates the write-path methods above.
     */
    setEditorMode,
    /** Set the zoom level directly (clamped to the editor's min/max). */
    setZoom,
    /** Step the zoom level up by one increment. */
    incrementZoom,
    /** Step the zoom level down by one increment. */
    decrementZoom,
    /** The live renderer DOM element, or `null` before mount. */
    rendererEl,
    /**
     * Imperative connector namespace (`get` / `update` / `pulse`) for
     * live-data hosts. See each member for gating and history semantics.
     */
    Connector,
    /**
     * @deprecated Escape hatch — direct zustand model store access.
     * Prefer the typed accessors above; will be removed before v1.0.
     */
    Model,
    /**
     * @deprecated Escape hatch — direct UI-state actions access.
     * Prefer the typed accessors above; will be removed before v1.0.
     */
    uiState: uiStateActions
  };
};

export { useReticulyne };
export * from 'src/standaloneExports';
export default Reticulyne;
