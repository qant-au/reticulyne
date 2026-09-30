import { useCallback, useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import type { State } from 'src/stores/reducers/types';
import * as reducers from 'src/stores/reducers';
import type { Projection } from 'src/types';
import { getItemByIdOrThrow } from 'src/utils';
import { useSceneItems } from './scene/useSceneItems';
import { useSceneConnectors } from './scene/useSceneConnectors';
import { useSceneShapes } from './scene/useSceneShapes';
import { useSceneClipboard } from './scene/useSceneClipboard';
import { useSceneGroups } from './scene/useSceneGroups';
import {
  CONNECTOR_DEFAULTS,
  RECTANGLE_DEFAULTS,
  TEXTBOX_DEFAULTS
} from 'src/config';

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

  const currentView = useMemo(() => {
    return getItemByIdOrThrow(model.views, currentViewId).value;
  }, [currentViewId, model.views]);

  const items = useMemo(() => {
    return currentView.items ?? [];
  }, [currentView.items]);

  const colors = useMemo(() => {
    return model.colors;
  }, [model.colors]);

  const connectors = useMemo(() => {
    return (currentView.connectors ?? []).map((connector) => {
      const sceneConnector = scene.connectors[connector.id];

      return {
        ...CONNECTOR_DEFAULTS,
        ...connector,
        ...sceneConnector
      };
    });
  }, [currentView.connectors, scene.connectors]);

  const rectangles = useMemo(() => {
    return (currentView.rectangles ?? []).map((rectangle) => {
      return {
        ...RECTANGLE_DEFAULTS,
        ...rectangle
      };
    });
  }, [currentView.rectangles]);

  const textBoxes = useMemo(() => {
    return (currentView.textBoxes ?? []).map((textBox) => {
      const sceneTextBox = scene.textBoxes[textBox.id];

      return {
        ...TEXTBOX_DEFAULTS,
        ...textBox,
        ...sceneTextBox
      };
    });
  }, [currentView.textBoxes, scene.textBoxes]);

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
    } finally {
      historyActions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyActions]);

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
    } finally {
      historyActions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyActions]);

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
    // How the current view is drawn (lw-050): isometric or flat.
    projection: currentView.kind ?? 'iso',
    setViewKind,
    ...itemOps,
    ...connectorOps,
    ...shapeOps,
    ...clipboardOps,
    ...groupOps,
    undo,
    redo
  };
};
