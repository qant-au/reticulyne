import { useCallback, useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import type { State } from 'src/stores/reducers/types';
import * as reducers from 'src/stores/reducers';
import type { Connection, Layer, Model, Projection } from 'src/types';
import { filterViewByLayers, getItemByIdOrThrow } from 'src/utils';
import { useLayerFilter } from './sceneLists';
import { useSceneItems } from './scene/useSceneItems';
import { useSceneConnectors } from './scene/useSceneConnectors';
import { useSceneShapes } from './scene/useSceneShapes';
import { useSceneClipboard } from './scene/useSceneClipboard';
import { useSceneGroups } from './scene/useSceneGroups';
import { useSceneLayers } from './scene/useSceneLayers';
import { useSceneLock } from './scene/useSceneLock';
import { useSceneFloors } from './scene/useSceneFloors';
import { useView } from './useView';
import {
  CONNECTOR_DEFAULTS,
  RECTANGLE_DEFAULTS,
  TEXTBOX_DEFAULTS
} from 'src/config';

const EMPTY_LAYERS: Layer[] = [];
const EMPTY_CONNECTIONS: Connection[] = [];

// QUA-13: useScene owns every store subscription and the setState /
// undo / redo chokepoint; the domain operations live in ./scene/*.
export const useScene = () => {
  const model = useModelStore((state) => {
    return state;
  });

  const scene = useSceneStore((state) => {
    return state;
  });

  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const currentView = useMemo(() => {
    return getItemByIdOrThrow(model.views, currentViewId).value;
  }, [currentViewId, model.views]);

  const leftOut = useLayerFilter();
  const visibleView = useMemo(() => {
    return filterViewByLayers(currentView, leftOut);
  }, [currentView, leftOut]);

  const items = useMemo(() => {
    return visibleView.items ?? [];
  }, [visibleView.items]);

  const colors = useMemo(() => {
    return model.colors;
  }, [model.colors]);

  const connectors = useMemo(() => {
    return (visibleView.connectors ?? []).map((connector) => {
      const sceneConnector = scene.connectors[connector.id];

      return {
        ...CONNECTOR_DEFAULTS,
        ...connector,
        ...sceneConnector
      };
    });
  }, [visibleView.connectors, scene.connectors]);

  const rectangles = useMemo(() => {
    return (visibleView.rectangles ?? []).map((rectangle) => {
      return {
        ...RECTANGLE_DEFAULTS,
        ...rectangle
      };
    });
  }, [visibleView.rectangles]);

  const textBoxes = useMemo(() => {
    return (visibleView.textBoxes ?? []).map((textBox) => {
      const sceneTextBox = scene.textBoxes[textBox.id];

      return {
        ...TEXTBOX_DEFAULTS,
        ...textBox,
        ...sceneTextBox
      };
    });
  }, [visibleView.textBoxes, scene.textBoxes]);

  const getState = useCallback(() => {
    return {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
  }, [model.actions, scene.actions]);

  // PRF-07: two narrow selectors, not the whole store. Selecting `state`
  // re-rendered every useScene consumer on each undo-stack push; `actions`
  // is stable and `isApplying` only flips around an undo/redo.
  const historyIsApplying = useHistoryStore((state) => {
    return state.isApplying;
  });
  const historyActions = useHistoryStore((state) => {
    return state.actions;
  });

  // setState is the single chokepoint for every model mutation, so
  // this is where FEA5-03 records the prior state into the undo
  // stack. While undo/redo are restoring a saved snapshot, the
  // history store flips `isApplying` so this guard skips the
  // record — otherwise undo would push the state we're trying to
  // undo BACK onto the past stack.
  const setState = useCallback(
    (newState: State) => {
      if (!historyIsApplying) {
        historyActions.recordPriorState(
          {
            model: model.actions.get(),
            scene: scene.actions.get()
          },
          newState
        );
      }
      model.actions.set(newState.model);
      scene.actions.set(newState.scene);
    },
    [model.actions, scene.actions, historyIsApplying, historyActions]
  );

  // lw-053: an undo or redo can take away the floor on show (one added,
  // then undone). Show the lowest floor instead of drawing one that is gone.
  const { changeView } = useView();
  const keepViewShown = useCallback(
    (restored: Model) => {
      if (
        restored.views.some((v) => {
          return v.id === currentViewId;
        })
      ) {
        return;
      }
      uiStateActions.clearSelection();
      changeView(restored.views[0].id, restored);
    },
    [currentViewId, uiStateActions, changeView]
  );

  const undo = useCallback(() => {
    const current: State = {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
    const priorState = historyActions.undo(current);
    if (priorState === null) return;
    historyActions.setIsApplying(true);
    try {
      model.actions.set(priorState.model);
      scene.actions.set(priorState.scene);
      keepViewShown(priorState.model);
    } finally {
      historyActions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyActions, keepViewShown]);

  const redo = useCallback(() => {
    const current: State = {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
    const nextState = historyActions.redo(current);
    if (nextState === null) return;
    historyActions.setIsApplying(true);
    try {
      model.actions.set(nextState.model);
      scene.actions.set(nextState.scene);
      keepViewShown(nextState.model);
    } finally {
      historyActions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyActions, keepViewShown]);

  // lw-050: draw the current view isometrically or flat. Undoable, and
  // saved on the view; 'iso' is stored as no kind at all.
  const setViewKind = useCallback(
    (kind: Projection) => {
      setState(
        reducers.view({
          action: 'UPDATE_VIEW',
          payload: { kind: kind === 'schematic' ? kind : undefined },
          ctx: { viewId: currentViewId, state: getState() }
        })
      );
    },
    [getState, setState, currentViewId]
  );

  const itemOps = useSceneItems({ getState, setState, currentViewId });
  const connectorOps = useSceneConnectors({
    getState,
    setState,
    currentViewId,
    historyActions,
    sceneActions: scene.actions
  });
  const shapeOps = useSceneShapes({ getState, setState, currentViewId });
  const groupOps = useSceneGroups({
    getState,
    setState,
    currentViewId,
    currentView
  });
  const layerOps = useSceneLayers({ getState, setState, currentViewId });
  const lockOps = useSceneLock({ getState, setState, currentViewId });
  const floorOps = useSceneFloors({
    getState,
    setState,
    currentViewId,
    currentView
  });
  const clipboardOps = useSceneClipboard({
    getState,
    setState,
    currentViewId,
    currentView
  });

  return {
    items,
    connectors,
    colors,
    rectangles,
    textBoxes,
    currentView,
    // lw-052: the current view as drawn, less its hidden layers.
    visibleView,
    // How the current view is drawn (lw-050): isometric or flat.
    projection: currentView.kind ?? 'iso',
    setViewKind,
    ...itemOps,
    ...connectorOps,
    ...shapeOps,
    ...clipboardOps,
    ...groupOps,
    ...layerOps,
    ...lockOps,
    ...floorOps,
    // lw-052: the diagram's layers; the base layer is never listed.
    layers: model.layers ?? EMPTY_LAYERS,
    // lw-053: the floors are the views, lowest first.
    floors: model.views,
    connections: model.connections ?? EMPTY_CONNECTIONS,
    undo,
    redo
  };
};
