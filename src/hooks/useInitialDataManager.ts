import { useCallback, useEffect, useState, useRef } from 'react';
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
  // onModelUpdatedRef in Isoflow.tsx.
  const onValidationErrorRef = useRef(onValidationError);
  useEffect(() => {
    onValidationErrorRef.current = onValidationError;
  }, [onValidationError]);

  const iconCollectionsRef = useRef(iconCollections);
  useEffect(() => {
    iconCollectionsRef.current = iconCollections;
  }, [iconCollections]);

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
          // <Isoflow onValidationError={...} /> prop) to route this
          // into their own error-reporting pipeline.
          console.error(
            '[isoflow] initialData failed schema validation:',
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

        const { zoom, scroll } = getFitToViewParams(view.value, {
          width: rendererSize?.width ?? 0,
          height: rendererSize?.height ?? 0
        });

        uiStateActions.setScroll({
          position: scroll,
          offset: CoordsUtils.zero()
        });

        uiStateActions.setZoom(zoom);
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

  const clear = useCallback(() => {
    load({ ...INITIAL_DATA, icons: model.icons, colors: model.colors });
    uiStateActions.resetUiState();
  }, [load, model.icons, model.colors, uiStateActions]);

  return {
    load,
    clear,
    isReady
  };
};
