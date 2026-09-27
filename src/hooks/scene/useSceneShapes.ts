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

  // Worklist 19: give every coloured member of a selection one palette
  // colour, in one undo step. Only connectors and rectangles have a
  // colour; a rectangle's hex override is cleared, or it would win over
  // the palette colour just chosen. Other kinds are ignored.
  const setColour = useCallback(
    (targets: ItemReference[], color: string) => {
      let state = getState();
      for (const t of targets) {
        if (t.type === 'CONNECTOR') {
          state = reducers.view({
            action: 'UPDATE_CONNECTOR',
            payload: { id: t.id, color },
            ctx: { viewId: currentViewId, state }
          });
        } else if (t.type === 'RECTANGLE') {
          state = reducers.view({
            action: 'UPDATE_RECTANGLE',
            payload: { id: t.id, color, colorValue: undefined },
            ctx: { viewId: currentViewId, state }
          });
        }
      }
      setState(state);
    },
    [getState, setState, currentViewId]
  );

  return {
    setColour,
    createTextBox,
    updateTextBox,
    deleteTextBox,
    createRectangle,
    updateRectangle,
    deleteRectangle,
    changeLayerOrder
  };
};
