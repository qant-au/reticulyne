import { useCallback } from 'react';
import {
  TextBox,
  Rectangle,
  ItemReference,
  LayerOrderingAction
} from 'src/types';
import * as reducers from 'src/stores/reducers';
import type { SceneCore } from './types';

// Text boxes, rectangles and layer ordering.
export const useSceneShapes = ({
  getState,
  setState,
  currentViewId
}: Pick<SceneCore, 'getState' | 'setState' | 'currentViewId'>) => {
  const createTextBox = useCallback(
    (newTextBox: TextBox) => {
      const newState = reducers.view({
        action: 'CREATE_TEXTBOX',
        payload: newTextBox,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateTextBox = useCallback(
    (id: string, updates: Partial<TextBox>) => {
      const newState = reducers.view({
        action: 'UPDATE_TEXTBOX',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteTextBox = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_TEXTBOX',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const createRectangle = useCallback(
    (newRectangle: Rectangle) => {
      const newState = reducers.view({
        action: 'CREATE_RECTANGLE',
        payload: newRectangle,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateRectangle = useCallback(
    (id: string, updates: Partial<Rectangle>) => {
      const newState = reducers.view({
        action: 'UPDATE_RECTANGLE',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteRectangle = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_RECTANGLE',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const changeLayerOrder = useCallback(
    // One target, or several moved as one block in a single undo step.
    (action: LayerOrderingAction, target: ItemReference | ItemReference[]) => {
      const items = Array.isArray(target) ? target : [target];
      const newState = reducers.view({
        action: 'CHANGE_LAYER_ORDER',
        payload: { action, items },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  return {
    createTextBox,
    updateTextBox,
    deleteTextBox,
    createRectangle,
    updateRectangle,
    deleteRectangle,
    changeLayerOrder
  };
};
