import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { createReticulyneTheme } from 'src/styles/theme';
import { useResolvedThemeMode } from 'src/hooks/useResolvedThemeMode';
import { ThemeToggleContext } from 'src/hooks/useThemeToggle';
import type {
  ApplyPatchOptions,
  Connector as ConnectorType,
  DiagramPatch,
  InitialData,
  NodeInfo,
  NodePatch,
  ReticulyneProps,
  Model,
  ModelStore,
  SelectedRef,
  Viewport
} from 'src/types';
import {
  setWindowCursor,
  modelFromModelStore,
  getFitToViewParams,
  getTilePosition,
  CoordsUtils
} from 'src/utils';
import { useModelStore, ModelProvider } from 'src/stores/modelStore';
import { SceneProvider, useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import * as reducers from 'src/stores/reducers';
import { CONNECTOR_DEFAULTS, MIN_ZOOM, MAX_ZOOM } from 'src/config';
import { HistoryProvider } from 'src/stores/historyStore';
import { GlobalStyles } from 'src/styles/GlobalStyles';
import { Renderer } from 'src/components/Renderer/Renderer';
import { UiOverlay } from 'src/components/UiOverlay/UiOverlay';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { DEFAULT_COLOR, INITIAL_DATA, MAIN_MENU_OPTIONS } from 'src/config';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useSaveController } from 'src/hooks/useSaveController';
import { useView } from 'src/hooks/useView';
import { useHostEvents } from 'src/hooks/useHostEvents';
import {
  isGestureActive,
  usePatchApplier,
  usePatchQueueFlush
} from 'src/hooks/usePatchApplier';
import { initialDataSchema } from 'src/schemas/model';
import { connectorSchema } from 'src/schemas/connector';
import { TEMPLATES } from 'src/templates';
import { isSceneDocument, type Scene } from 'src/vendor/accurona-core';
import { leanIcons, sceneFromModel, type LoadHints } from 'src/scene';
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
  showAlignmentGuides = true,
  showMiniMap,
  onNodeClick,
  onConnectorClick,
  onSelectionChange,
  onViewportChange,
  onIconUpload,
  onDiagramReplaced,
  templates = TEMPLATES,
  iconCollections,
  onSave,
  autoSaveDebounce = false,
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

  // 2.3: dirty state, opt-in auto-save and the leave-page warning.
  useSaveController({
    model,
    isReady: initialDataManager.isReady,
    autoSaveDebounce
  });

  // Memoise the merged `{ ...INITIAL_DATA, ...initialData }` so its
  // reference is stable whenever the consumer's `initialData` ref is
  // stable. Previously this merge happened inline inside the effect
  // body, producing a fresh object on every effect run and defeating the
  // reference-equality dedupe guard inside `useInitialDataManager.load`
  // — every consumer re-render would re-seed the entire model store and
  // wipe any unsaved items the user had just placed.
  // A scene is loaded as it is: its fields are not Reticulyne's defaults.
  const mergedInitialData = useMemo(() => {
    if (isSceneDocument(initialData)) return initialData as Scene;
    return { ...INITIAL_DATA, ...(initialData as InitialData | undefined) };
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

  useEffect(() => {
    uiStateActions.setShowAlignmentGuides(showAlignmentGuides);
  }, [showAlignmentGuides, uiStateActions]);

  useEffect(() => {
    uiStateActions.setShowMiniMap(showMiniMap);
  }, [showMiniMap, uiStateActions]);

  // 1.6: host events. The click handlers live on the store, where the
  // interaction manager reads them at click time.
  useEffect(() => {
    uiStateActions.setClickHandlers({ onNodeClick, onConnectorClick });
  }, [onNodeClick, onConnectorClick, uiStateActions]);
  useHostEvents({ onSelectionChange, onViewportChange });

  useEffect(() => {
    uiStateActions.setOnIconUpload(onIconUpload);
  }, [onIconUpload, uiStateActions]);

  useEffect(() => {
    uiStateActions.setOnDiagramReplaced(onDiagramReplaced);
  }, [onDiagramReplaced, uiStateActions]);

  useEffect(() => {
    uiStateActions.setTemplates(templates);
  }, [templates, uiStateActions]);

  // 1.5: patches held back by a drag or a draw land when it ends.
  usePatchQueueFlush();

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
          // clip, not hidden: a hidden box can still be scrolled by the
          // browser, and focusing a field in a panel that overhung the
          // edge scrolled the whole editor 161px sideways, for good.
          overflow: 'clip',
          transform: 'translateZ(0)',
          // A marquee drag selected the page text it crossed (the
          // inspector, the title, the zoom readout). Only the fields
          // meant for typing stay selectable.
          userSelect: 'none',
          '& input, & textarea, & [contenteditable="true"]': {
            userSelect: 'text'
          }
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
  const hostMode = useResolvedThemeMode(themeMode);
  // UXA-08: Alt+Shift+D flips light <-> dark for this session, over the
  // host's themeMode (binary, as in Excalidraw; not persisted - a reload
  // returns to the host's setting). Until pressed, the host decides.
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);
  const resolvedMode = override ?? hostMode;
  const toggleTheme = useCallback(() => {
    setOverride(resolvedMode === 'dark' ? 'light' : 'dark');
  }, [resolvedMode]);
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
      <ThemeToggleContext.Provider value={toggleTheme}>
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
      </ThemeToggleContext.Provider>
    </ReticulyneErrorBoundary>
  );
};

const clampZoom = (zoom: number) => {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
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

  // `Model` above is internal (setTitle writes through it). It was also
  // returned as an escape hatch, with `uiState`, until 1.6 replaced both
  // with the typed methods below.
  const getModel = useCallback((): Model => {
    return modelFromModelStore(ModelActions.get());
  }, [ModelActions]);

  // The diagram as a scene (the file format): the model merged into the
  // scene it was opened from, as a save hands it to onSave.
  const getScene = useCallback((): Scene => {
    return leanIcons(
      sceneFromModel(
        modelFromModelStore(ModelActions.get()),
        uiStateActions.get().sceneContext
      )
    );
  }, [ModelActions, uiStateActions]);

  const loadModel = useCallback(
    (data: Scene | InitialData, options?: LoadHints): void => {
      if (editorModeRef.current !== 'EDITABLE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[reticulyne] Refusing loadModel call in editorMode="${editorModeRef.current}". ` +
              `Set editorMode="EDITABLE" to allow programmatic loads.`
          );
        }
        return;
      }
      initialDataManager.load(data, options);
    },
    [initialDataManager]
  );

  // FEA-06: switch the visible view. The editor has no view-switcher UI,
  // so before this the only way to show a non-default view was to seed
  // `initialData.view`. Navigation, not a mutation, so it is NOT gated on
  // editorMode. The selection belongs to the old view's items, so it is
  // cleared; an unknown id warns and does nothing rather than throwing.
  const { changeView } = useView();
  const setView = useCallback(
    (viewId: string): void => {
      const model = modelFromModelStore(ModelActions.get());
      const exists = model.views.some((view) => {
        return view.id === viewId;
      });
      if (!exists) {
        console.warn(`[reticulyne] setView: no view with id "${viewId}".`);
        return;
      }
      uiStateActions.clearSelection();
      changeView(viewId, model);
    },
    [ModelActions, changeView, uiStateActions]
  );

  // 1.2: the diagram title. setTitle goes through the gated Model.set, so
  // it is EDITABLE-only and schema-validated like every other model write
  // (over 100 characters is refused through onValidationError). A blank
  // title becomes 'Untitled'. No undo entry, by design: renaming is not
  // part of the drawing's history.
  const getTitle = useCallback((): string => {
    return ModelActions.get().title;
  }, [ModelActions]);
  const setTitle = useCallback(
    (title: string): void => {
      Model.set({ title: title.trim() || 'Untitled' });
    },
    [Model]
  );

  const setEditorMode = uiStateActions.setEditorMode;
  const setZoom = useCallback(
    (zoom: number): void => {
      uiStateActions.setZoom(clampZoom(zoom));
    },
    [uiStateActions]
  );
  const incrementZoom = uiStateActions.incrementZoom;
  const decrementZoom = uiStateActions.decrementZoom;

  // 1.5: live updates. Validated up front, so a bad patch is reported when
  // the host sends it rather than whenever a queued gesture ends. Refused
  // only in NON_INTERACTIVE, as Connector.update is: a read-only dashboard
  // is exactly where live data belongs.
  const applyPatchNow = usePatchApplier();
  const applyPatch = useCallback(
    (patch: DiagramPatch, options: ApplyPatchOptions = {}): void => {
      if (editorModeRef.current === 'NON_INTERACTIVE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[reticulyne] Refusing applyPatch in editorMode="${editorModeRef.current}".`
          );
        }
        return;
      }
      const parsed = reducers.diagramPatchSchema.safeParse(patch);
      if (!parsed.success) {
        const cb = onValidationErrorRef.current;
        if (cb) {
          cb(parsed.error.issues);
        } else {
          console.error(
            '[reticulyne] applyPatch rejected — patch failed schema validation:',
            parsed.error.issues
          );
        }
        return;
      }
      if (isGestureActive(uiStateActions.get())) {
        uiStateActions.enqueuePatch({ patch: parsed.data, options });
        return;
      }
      applyPatchNow(parsed.data, options);
    },
    [applyPatchNow, uiStateActions]
  );
  const updateNode = useCallback(
    (id: string, patch: NodePatch, options?: ApplyPatchOptions): void => {
      applyPatch({ items: { [id]: patch } }, options);
    },
    [applyPatch]
  );
  const setConnectorRate = useCallback(
    (id: string, rate: number, options?: ApplyPatchOptions): void => {
      applyPatch({ connectors: { [id]: { animationRate: rate } } }, options);
    },
    [applyPatch]
  );

  // 1.6: reads. Each returns a fresh object, never a store reference.
  const currentView = useCallback(() => {
    const viewId = uiStateActions.get().view;
    return ModelActions.get().views.find((v) => {
      return v.id === viewId;
    });
  }, [ModelActions, uiStateActions]);
  const getNode = useCallback(
    (id: string): NodeInfo | undefined => {
      const item = ModelActions.get().items.find((i) => {
        return i.id === id;
      });
      if (!item) return undefined;
      const placed = currentView()?.items.find((i) => {
        return i.id === id;
      });
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        tile: placed ? { x: placed.tile.x, y: placed.tile.y } : null
      };
    },
    [ModelActions, currentView]
  );
  const getViewport = useCallback((): Viewport => {
    const { zoom, scroll, view } = uiStateActions.get();
    return {
      zoom,
      scroll: { x: scroll.position.x, y: scroll.position.y },
      viewId: view
    };
  }, [uiStateActions]);
  const getSelection = useCallback((): SelectedRef[] => {
    return uiStateActions.get().selection.map((ref) => {
      return { type: ref.type as SelectedRef['type'], id: ref.id };
    });
  }, [uiStateActions]);

  // 1.6: view. Navigation, so allowed in every editor mode, like setView.
  const focusNode = useCallback(
    (id: string, options: { zoom?: number } = {}): void => {
      const placed = currentView()?.items.find((i) => {
        return i.id === id;
      });
      if (!placed) {
        console.warn(`[reticulyne] focusNode: "${id}" is not on this view.`);
        return;
      }
      const live = uiStateActions.get();
      const zoom =
        options.zoom === undefined ? live.zoom : clampZoom(options.zoom);
      const p = getTilePosition({
        tile: placed.tile,
        projection: currentView()?.kind
      });
      uiStateActions.setZoom(zoom);
      uiStateActions.setScroll({
        position: { x: -p.x * zoom, y: -p.y * zoom },
        offset: live.scroll.offset
      });
    },
    [currentView, uiStateActions]
  );
  const fitToView = useCallback((): void => {
    const view = currentView();
    const el = uiStateActions.get().rendererEl;
    if (!view || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const { zoom, scroll } = getFitToViewParams(view, { width, height });
    uiStateActions.setScroll({ position: scroll, offset: CoordsUtils.zero() });
    uiStateActions.setZoom(zoom);
  }, [currentView, uiStateActions]);

  // 1.6: selection. Only an editable diagram shows one, so select() is
  // EDITABLE only; ids not on the current view are skipped.
  const select = useCallback(
    (ids: string | string[]): void => {
      if (editorModeRef.current !== 'EDITABLE') {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[reticulyne] Refusing select in editorMode="${editorModeRef.current}".`
          );
        }
        return;
      }
      const view = currentView();
      if (!view) return;
      const kinds: [SelectedRef['type'], { id: string }[] | undefined][] = [
        ['ITEM', view.items],
        ['CONNECTOR', view.connectors],
        ['RECTANGLE', view.rectangles],
        ['TEXTBOX', view.textBoxes]
      ];
      const refs = (Array.isArray(ids) ? ids : [ids]).flatMap((id) => {
        const kind = kinds.find(([, list]) => {
          return (list ?? []).some((x) => {
            return x.id === id;
          });
        });
        return kind ? [{ type: kind[0], id }] : [];
      });
      uiStateActions.setSelection(refs);
    },
    [currentView, uiStateActions]
  );
  const clearSelection = uiStateActions.clearSelection;

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
      // SEC-03: validate the patch before it reaches the reducer. A host
      // driving Connector.update from untrusted live data could otherwise
      // push out-of-enum `direction`/`style`/`glyph`, a non-id `color`, or
      // a non-number `width`. Validate only the patched fields against a
      // partial of connectorSchema; route failures to onValidationError
      // (same path as Model.set / SEC-02) without mutating state.
      const parsed = connectorSchema
        .pick({
          color: true,
          width: true,
          style: true,
          direction: true,
          glyph: true,
          animated: true
        })
        .partial()
        .safeParse(patch);
      if (!parsed.success) {
        const cb = onValidationErrorRef.current;
        if (cb) {
          cb(parsed.error.issues);
        } else {
          console.error(
            '[reticulyne] Connector.update rejected — patch failed schema validation:',
            parsed.error.issues
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
        payload: { id, ...parsed.data },
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
    /** Return a snapshot of the current model (live editor state). */
    getModel,
    /**
     * The diagram as a scene, the file format: what a save hands to
     * `onSave`. Use this, not `getModel()`, to persist the diagram.
     */
    getScene,
    /**
     * Replace the editor's contents with a scene, or a legacy Reticulyne
     * model (converted to a scene). Validated whole. `options` can fit the
     * diagram to the screen or open a given view. No-op (warns in dev)
     * unless `editorMode` is `EDITABLE`; set `editorMode="EDITABLE"` before
     * calling to allow programmatic loads.
     */
    loadModel,
    /** The diagram title. */
    getTitle,
    /**
     * Rename the diagram. EDITABLE only; validated (max 100 characters);
     * a blank title becomes 'Untitled'. Not recorded in undo history.
     */
    setTitle,
    /**
     * Switch the editor mode (`EDITABLE` | `EXPLORABLE` |
     * `NON_INTERACTIVE`). Gates the write-path methods above.
     */
    setEditorMode,
    /**
     * Show another view (floor) of the model by id. Allowed in every
     * editor mode; clears the selection; warns and no-ops on an unknown id.
     */
    setView,
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

    // --- 1.5 / 1.6: live updates ---
    /**
     * Apply a set of changes by id: node names, descriptions, icons and
     * positions; connector, rectangle and text-box styling. Never touches
     * the selection, zoom or pan. Ids that no longer exist are skipped.
     * During a drag, a marquee or a connector or rectangle being drawn, the
     * patch waits and lands when the gesture ends. Validated first: a bad
     * patch goes to `onValidationError` and nothing changes. Not on the
     * undo stack unless `{ pushToUndo: true }`. Refused (warns in dev) in
     * `NON_INTERACTIVE`.
     */
    applyPatch,
    /** `applyPatch` for one node: `updateNode(id, { name: 'db-2' })`. */
    updateNode,
    /**
     * Set a connector's animation rate, 0 (stopped) to 1 (full speed).
     * Shorthand for `applyPatch({ connectors: { [id]: { animationRate } } })`;
     * animation shows only with the `enableAnimation` prop.
     */
    setConnectorRate,

    // --- 1.6: reads (fresh copies, never live references) ---
    /** A node, or `undefined`; `tile` is null when it is not on this view. */
    getNode,
    /** Zoom, pan offset and current view id. */
    getViewport,
    /** What is selected, oldest first. */
    getSelection,

    // --- 1.6: view (allowed in every editor mode) ---
    /**
     * Centre the view on a node, optionally at a new zoom (clamped).
     * Warns and does nothing if the node is not on the current view.
     */
    focusNode,
    /** Zoom and pan so the whole current view fits the editor. */
    fitToView,

    // --- 1.6: selection ---
    /**
     * Select these ids (nodes, connectors, rectangles or text boxes on the
     * current view), replacing the selection. Unknown ids are skipped.
     * EDITABLE only.
     */
    select,
    /** Clear the selection. */
    clearSelection
  };
};

export { useReticulyne };
export * from 'src/standaloneExports';
export default Reticulyne;
