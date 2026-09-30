import { useCallback, useEffect } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import * as reducers from 'src/stores/reducers';
import type { ApplyPatchOptions, DiagramPatch, UiState } from 'src/types';

// true while the user is part-way through a gesture that a
// model change underneath would corrupt: dragging items, a marquee, or
// drawing or resizing a connector or rectangle. Patches wait until it ends.
export const isGestureActive = (ui: Pick<UiState, 'mode'>): boolean => {
  const { mode } = ui;
  switch (mode.type) {
    case 'DRAG_ITEMS':
    case 'MARQUEE':
    case 'RECTANGLE.TRANSFORM':
      return true;
    case 'CONNECTOR':
    case 'RECTANGLE.DRAW':
      return mode.id !== null;
    default:
      return false;
  }
};

// lw-090: how long a colour change from a patch takes to fade in. The
// attribute stays on a little longer than the fade, because taking the
// transition away mid-fade would snap it to the end colour.
export const PATCH_FADE_MS = 200;
export const PATCH_FADE_ATTR = 'data-patch-fade';
const fadeTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

// Scopes the fade to patches: a colour the user picks, an undo or a
// selection outline still changes at once. The CSS lives on the Renderer.
const openFadeWindow = (el: HTMLElement | null) => {
  if (!el) return;
  el.setAttribute(PATCH_FADE_ATTR, '');
  clearTimeout(fadeTimers.get(el));
  fadeTimers.set(
    el,
    setTimeout(() => {
      el.removeAttribute(PATCH_FADE_ATTR);
      fadeTimers.delete(el);
    }, PATCH_FADE_MS + 100)
  );
};

// Applies an already-validated patch to the model and scene stores. Reads
// the stores at call time, so it is safe to call before a view is loaded
// (it does nothing then) and from long-lived host closures.
export const usePatchApplier = () => {
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const sceneActions = useSceneStore((state) => {
    return state.actions;
  });
  const historyActions = useHistoryStore((state) => {
    return state.actions;
  });
  const uiActions = useUiStateStore((state) => {
    return state.actions;
  });

  return useCallback(
    (patch: DiagramPatch, options: ApplyPatchOptions = {}) => {
      const prior = {
        model: modelActions.get(),
        scene: sceneActions.get()
      };
      const viewId = uiActions.get().view;
      if (!viewId) return;
      let next;
      try {
        next = reducers.applyDiagramPatch(patch, viewId, prior);
      } catch (error) {
        // A reducer refused the result (a move onto an occupied tile, say).
        // Nothing has been written, so the diagram is left as it was.
        console.warn('[reticulyne] applyPatch skipped:', error);
        return;
      }
      if (next === prior) return;
      openFadeWindow(uiActions.get().rendererEl);
      if (options.pushToUndo) {
        historyActions.recordPriorState(prior);
        modelActions.set(next.model);
        sceneActions.set(next.scene);
        return;
      }
      historyActions.setIsApplying(true);
      try {
        modelActions.set(next.model);
        sceneActions.set(next.scene);
      } finally {
        historyActions.setIsApplying(false);
      }
    },
    [modelActions, sceneActions, historyActions, uiActions]
  );
};

// Mounted once, in App: applies queued patches the moment the gesture that
// held them back ends, in the order they arrived.
export const usePatchQueueFlush = () => {
  const busy = useUiStateStore((state) => {
    return isGestureActive(state);
  });
  const queued = useUiStateStore((state) => {
    return state.patchQueue.length;
  });
  const uiActions = useUiStateStore((state) => {
    return state.actions;
  });
  const apply = usePatchApplier();

  useEffect(() => {
    if (busy || queued === 0) return;
    uiActions.takePatches().forEach(({ patch, options }) => {
      apply(patch, options);
    });
  }, [busy, queued, uiActions, apply]);
};
