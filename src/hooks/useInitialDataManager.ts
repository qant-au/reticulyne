import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { ZodIssue } from 'zod';
import { InitialData, IconCollectionState } from 'src/types';
import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import {
  getFitToViewParams,
  CoordsUtils,
  categoriseIcons,
  filterIconsByCollection,
  generateId,
  getItemByIdOrThrow
} from 'src/utils';
import * as reducers from 'src/stores/reducers';
import { useModelStore } from 'src/stores/modelStore';
import { useView } from 'src/hooks/useView';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { initialDataSchema } from 'src/schemas/model';

interface UseInitialDataManagerOptions {
  /**
   * Invoked when `load()` is called with a value that does not match
   * `initialDataSchema`. The argument is the array of Zod issues from
   * the failed parse. When omitted, the hook falls back to
   * `console.error` so the failure is still visible in dev tools
   * without interrupting the consumer's page with a modal.
   */
  onValidationError?: (issues: ZodIssue[]) => void;
  /**
   * Filter which icon collections reach the model store. Applied
   * post-validation before icons are committed to state. When omitted,
   * every icon in the validated data passes through unchanged.
   */
  iconCollections?: { allow?: string[]; deny?: string[] };
}

export const useInitialDataManager = ({
  onValidationError,
  iconCollections
}: UseInitialDataManagerOptions = {}) => {
  const [isReady, setIsReady] = useState(false);
  const prevInitialData = useRef<InitialData | undefined>(undefined);
  // BUG5-12: stash the view id that needs fit-to-view when `load` runs
  // before the Renderer has mounted (App returns null until isReady, but
  // isReady is set inside load — so on the very first load the renderer
  // element is always null and getBoundingClientRect() returns 0/0,
  // collapsing zoom to 0 and producing NaN SVG geometry). When rendererEl
  // appears, the effect below picks up the pending id and applies the fit
  // with a real viewport size.
  const pendingFitToViewIdRef = useRef<string | null>(null);
  const model = useModelStore((state) => {
    return state;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const { changeView } = useView();

  // Stash the latest validation-error callback in a ref so `load`'s
  // useCallback identity stays stable across consumer re-renders that
  // pass a fresh inline closure each time. Same pattern as
  // onModelUpdatedRef in Reticulyne.tsx.
  const onValidationErrorRef = useRef(onValidationError);
  useEffect(() => {
    onValidationErrorRef.current = onValidationError;
  }, [onValidationError]);

  const iconCollectionsRef = useRef(iconCollections);
  // Stringify the filter spec for a stable identity dep. Hosts
  // typically pass `iconCollections` as an inline literal that
  // reinstantiates every render, so the raw object is unsafe to depend
  // on directly (infinite re-load loop). Allow- and deny-lists are
  // always small string arrays — stringify cost is negligible.
  const iconCollectionsKey = useMemo(() => {
    return JSON.stringify(iconCollections ?? null);
  }, [iconCollections]);
  const iconCollectionsKeyRef = useRef(iconCollectionsKey);
  useEffect(() => {
    iconCollectionsRef.current = iconCollections;
    if (iconCollectionsKeyRef.current !== iconCollectionsKey) {
      // Filter spec actually changed — invalidate the dedupe guard so
      // the next load() with the same _initialData reference
      // reprocesses with the new filter. Without this, a runtime
      // change to `iconCollections` (e.g. toggling AWS visibility in
      // the host UI) had no effect until `initialData`'s reference
      // also changed — see BUG5-06.
      prevInitialData.current = undefined;
      iconCollectionsKeyRef.current = iconCollectionsKey;
    }
  }, [iconCollections, iconCollectionsKey]);

  const load = useCallback(
    (_initialData: InitialData) => {
      if (!_initialData || prevInitialData.current === _initialData) return;

      setIsReady(false);

      const validationResult = initialDataSchema.safeParse(_initialData);

      if (!validationResult.success) {
        const cb = onValidationErrorRef.current;
        if (cb) {
          cb(validationResult.error.issues);
        } else {
          // Fallback: surface in the console (visible in dev tools)
          // but do not pop a window.alert — a library popping native
          // modals breaks every embedder's UX. The consumer can pass
          // an `onValidationError` callback (forwarded from the
          // <Reticulyne onValidationError={...} /> prop) to route this
          // into their own error-reporting pipeline.
          console.error(
            '[reticulyne] initialData failed schema validation:',
            validationResult.error.issues
          );
        }
        return;
      }

      const initialData = {
        ..._initialData,
        icons: filterIconsByCollection(
          _initialData.icons,
          iconCollectionsRef.current
        )
      };

      if (initialData.views.length === 0) {
        const updates = reducers.view({
          action: 'CREATE_VIEW',
          payload: {},
          ctx: {
            state: { model: initialData, scene: INITIAL_SCENE_STATE },
            viewId: generateId()
          }
        });

        Object.assign(initialData, updates.model);
      }

      // Stash the original input reference so the next call with the
      // same `_initialData` reference short-circuits at the line 69
      // guard. Stashing the post-filter spread would make the guard
      // dead code — that spread is a fresh object built on line 94 and
      // never `===` to any future caller-supplied input.
      prevInitialData.current = _initialData;
      model.actions.set(initialData);

      const view = getItemByIdOrThrow(
        initialData.views,
        initialData.view ?? initialData.views[0].id
      );

      changeView(view.value.id, initialData);

      if (initialData.fitToView) {
        const rendererSize = rendererEl?.getBoundingClientRect();

        if (
          !rendererSize ||
          rendererSize.width === 0 ||
          rendererSize.height === 0
        ) {
          // Renderer not mounted/measured yet — stash the target view
          // and let the rendererEl-watching effect apply the fit once
          // the canvas has real dimensions.
          pendingFitToViewIdRef.current = view.value.id;
        } else {
          const { zoom, scroll } = getFitToViewParams(view.value, {
            width: rendererSize.width,
            height: rendererSize.height
          });

          uiStateActions.setScroll({
            position: scroll,
            offset: CoordsUtils.zero()
          });

          uiStateActions.setZoom(zoom);
          pendingFitToViewIdRef.current = null;
        }
      }

      const categoriesState: IconCollectionState[] = categoriseIcons(
        initialData.icons
      ).map((collection) => {
        return {
          id: collection.name,
          isExpanded: false
        };
      });

      uiStateActions.setIconCategoriesState(categoriesState);

      setIsReady(true);
    },
    [changeView, model.actions, rendererEl, uiStateActions]
  );

  // BUG5-12: apply a deferred fit-to-view as soon as the Renderer
  // mounts. The first `load()` typically runs before the Renderer is in
  // the DOM (App returns null until isReady, and isReady is set inside
  // load), so the rendererEl-based fit inside load() couldn't measure a
  // viewport. We stash the target view id there and pick it up here.
  useEffect(() => {
    if (!rendererEl || !pendingFitToViewIdRef.current) return;

    const apply = () => {
      const targetId = pendingFitToViewIdRef.current;
      if (!targetId) return true;
      const rect = rendererEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const currentModel = model.actions.get();
      const view = currentModel.views.find((v) => {
        return v.id === targetId;
      });
      if (!view) {
        pendingFitToViewIdRef.current = null;
        return true;
      }
      const { zoom, scroll } = getFitToViewParams(view, {
        width: rect.width,
        height: rect.height
      });
      uiStateActions.setScroll({
        position: scroll,
        offset: CoordsUtils.zero()
      });
      uiStateActions.setZoom(zoom);
      pendingFitToViewIdRef.current = null;
      return true;
    };

    if (apply()) return;
    // Renderer is in the DOM but layout hasn't settled — try again on
    // the next frame. This covers StrictMode mount/remount and the
    // first paint pipeline where getBoundingClientRect briefly reports
    // 0x0.
    const raf = requestAnimationFrame(() => {
      apply();
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [rendererEl, model.actions, uiStateActions]);

  const clear = useCallback(() => {
    load({ ...INITIAL_DATA, icons: model.icons, colors: model.colors });
    uiStateActions.resetUiState();
  }, [load, model.icons, model.colors, uiStateActions]);

  return {
    load,
    clear,
    isReady,
    // Stable-identity dep callers can include in their load-effect deps
    // so a runtime change to the filter spec re-triggers the load
    // pipeline. Stringified internally — see comment by
    // `iconCollectionsKey` above.
    iconCollectionsKey
  };
};
