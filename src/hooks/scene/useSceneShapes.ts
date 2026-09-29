import { useCallback } from 'react';
import {
  TextBox,
  Rectangle,
  ItemReference,
  LayerOrderingAction,
  Coords
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

  // apply an arrangement's moves (see src/utils/arrange.ts)
  // in one undo step. A rectangle moves both corners, keeping its size;
  // connectors follow their nodes when the view syncs.
  const applyMoves = useCallback(
    (moves: { ref: ItemReference; delta: Coords }[]) => {
      let state = getState();
      const view = state.model.views.find((v) => {
        return v.id === currentViewId;
      });
      if (!view || moves.length === 0) return;
      const shift = (c: Coords, d: Coords) => {
        return { x: c.x + d.x, y: c.y + d.y };
      };
      for (const { ref, delta } of moves) {
        if (ref.type === 'ITEM') {
          const item = (view.items ?? []).find((i) => {
            return i.id === ref.id;
          });
          if (!item) continue;
          state = reducers.view({
            action: 'UPDATE_VIEWITEM',
            payload: { id: ref.id, tile: shift(item.tile, delta) },
            ctx: { viewId: currentViewId, state }
          });
        } else if (ref.type === 'TEXTBOX') {
          const textBox = (view.textBoxes ?? []).find((t) => {
            return t.id === ref.id;
          });
          if (!textBox) continue;
          state = reducers.view({
            action: 'UPDATE_TEXTBOX',
            payload: { id: ref.id, tile: shift(textBox.tile, delta) },
            ctx: { viewId: currentViewId, state }
          });
        } else if (ref.type === 'RECTANGLE') {
          const rect = (view.rectangles ?? []).find((r) => {
            return r.id === ref.id;
          });
          if (!rect) continue;
          state = reducers.view({
            action: 'UPDATE_RECTANGLE',
            payload: {
              id: ref.id,
              from: shift(rect.from, delta),
              to: shift(rect.to, delta)
            },
            ctx: { viewId: currentViewId, state }
          });
        }
      }
      setState(state);
    },
    [getState, setState, currentViewId]
  );

  return {
    applyMoves,
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
