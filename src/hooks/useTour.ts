import { useCallback, useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useView } from 'src/hooks/useView';
import { tourSchema } from 'src/schemas/tour';
import { MAX_ZOOM, MIN_ZOOM, TOUR_ZOOM } from 'src/config';
import {
  filterViewByCollapsedGroups,
  filterViewByLayers,
  getTilePosition,
  hiddenLayerIds,
  modelFromModelStore
} from 'src/utils';
import type { Model, TourState, TourStep, View } from 'src/types';

// lw-064: presentation / tour mode. A tour walks through nodes in order:
// each step switches to the node's view if need be, centres on it at the
// step's zoom (the scene layers animate the move), highlights it with the
// selection-dimming highlight, and shows its narration on the tour panel.
// Navigation, not a mutation, so it runs in every editor mode, as
// focusNode does; the panel's buttons and keys are left out only in
// NON_INTERACTIVE, where the host drives it.

const clampZoom = (zoom: number) => {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
};

const holds = (view: View, nodeId: string) => {
  return view.items.some((item) => {
    return item.id === nodeId;
  });
};

/** The view a step is shown on, or undefined when no view holds its node. */
export const viewForStep = (
  step: TourStep,
  model: Model,
  currentViewId: string
): View | undefined => {
  if (step.viewId !== undefined) {
    const named = model.views.find((view) => {
      return view.id === step.viewId;
    });
    return named && holds(named, step.nodeId) ? named : undefined;
  }
  const current = model.views.find((view) => {
    return view.id === currentViewId;
  });
  if (current && holds(current, step.nodeId)) return current;
  return model.views.find((view) => {
    return holds(view, step.nodeId);
  });
};

/**
 * With no steps given: every node shown on the current view, in reading
 * order (top to bottom, then left to right, as drawn on screen).
 */
export const defaultTourSteps = (
  model: Model,
  currentViewId: string
): TourStep[] => {
  const view = model.views.find((v) => {
    return v.id === currentViewId;
  });
  if (!view) return [];
  const shown = filterViewByCollapsedGroups(
    filterViewByLayers(view, hiddenLayerIds(model.layers))
  );
  return shown.items
    .map((item) => {
      return {
        id: item.id,
        at: getTilePosition({ tile: item.tile, projection: view.kind })
      };
    })
    .sort((a, b) => {
      return a.at.y - b.at.y || a.at.x - b.at.x;
    })
    .map(({ id }) => {
      return { nodeId: id };
    });
};

export const useTour = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const { changeView } = useView();

  const show = useCallback(
    (
      steps: TourStep[],
      index: number,
      hostHighlight: string | undefined
    ): boolean => {
      const model = modelFromModelStore(modelActions.get());
      const live = uiStateActions.get();
      const step = steps[index];
      const view = viewForStep(step, model, live.view);
      if (!view) {
        console.warn(
          `[reticulyne] tour: "${step.nodeId}" is no longer on any view.`
        );
        return false;
      }
      if (view.id !== live.view) {
        uiStateActions.clearSelection();
        changeView(view.id, model);
      }
      const placed = view.items.find((item) => {
        return item.id === step.nodeId;
      });
      if (!placed) return false;
      const zoom = clampZoom(step.zoom ?? TOUR_ZOOM);
      const p = getTilePosition({ tile: placed.tile, projection: view.kind });
      uiStateActions.setZoom(zoom);
      uiStateActions.setScroll({
        position: { x: -p.x * zoom, y: -p.y * zoom },
        offset: live.scroll.offset
      });
      uiStateActions.setHighlightedItemId(step.nodeId);
      uiStateActions.setTour({ steps, index, hostHighlight });
      live.onTourStepChange?.({
        index,
        total: steps.length,
        step: { ...step }
      });
      return true;
    },
    [changeView, modelActions, uiStateActions]
  );

  const start = useCallback(
    (steps?: TourStep[]): boolean => {
      const live = uiStateActions.get();
      const model = modelFromModelStore(modelActions.get());
      const source =
        steps ?? live.tourSteps ?? defaultTourSteps(model, live.view);
      const parsed = tourSchema.safeParse(source);
      if (!parsed.success) {
        if (live.onValidationError) {
          live.onValidationError(parsed.error.issues);
        } else {
          console.error(
            '[reticulyne] startTour rejected — steps failed schema validation:',
            parsed.error.issues
          );
        }
        return false;
      }
      // A step whose node is on no view (deleted since the tour was
      // written) is skipped rather than stopping the tour dead.
      const usable = parsed.data.filter((step) => {
        return viewForStep(step, model, live.view) !== undefined;
      });
      if (usable.length < parsed.data.length) {
        console.warn(
          `[reticulyne] startTour: skipped ${parsed.data.length - usable.length} step(s) whose node is not on a view.`
        );
      }
      if (usable.length === 0) {
        console.warn('[reticulyne] startTour: no step names a node on a view.');
        return false;
      }
      // Restarting keeps the highlight from before the first start.
      const hostHighlight = live.tour
        ? live.tour.hostHighlight
        : live.highlightedItemId;
      return show(usable, 0, hostHighlight);
    },
    [modelActions, show, uiStateActions]
  );

  const goTo = useCallback(
    (index: number): void => {
      const { tour } = uiStateActions.get();
      if (!tour) return;
      if (!Number.isInteger(index) || index < 0 || index >= tour.steps.length)
        return;
      if (index === tour.index) return;
      show(tour.steps, index, tour.hostHighlight);
    },
    [show, uiStateActions]
  );

  const next = useCallback((): void => {
    const { tour } = uiStateActions.get();
    if (tour) goTo(tour.index + 1);
  }, [goTo, uiStateActions]);

  const previous = useCallback((): void => {
    const { tour } = uiStateActions.get();
    if (tour) goTo(tour.index - 1);
  }, [goTo, uiStateActions]);

  const end = useCallback((): void => {
    const live = uiStateActions.get();
    if (!live.tour) return;
    uiStateActions.setTour(null);
    uiStateActions.setHighlightedItemId(live.tour.hostHighlight);
    live.onTourStepChange?.(null);
  }, [uiStateActions]);

  const getState = useCallback((): TourState | null => {
    const { tour } = uiStateActions.get();
    if (!tour) return null;
    return {
      index: tour.index,
      total: tour.steps.length,
      step: { ...tour.steps[tour.index] }
    };
  }, [uiStateActions]);

  return useMemo(() => {
    return { start, next, previous, goTo, end, getState };
  }, [start, next, previous, goTo, end, getState]);
};
