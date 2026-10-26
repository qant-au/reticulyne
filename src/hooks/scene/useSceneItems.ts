import { useCallback } from 'react';
import { ModelItem, ViewItem } from 'src/types';
import * as reducers from 'src/stores/reducers';
import type { SceneCore } from './types';

// Model items and their per-view placements.
export const useSceneItems = ({
  getState,
  setState,
  currentViewId
}: Pick<SceneCore, 'getState' | 'setState' | 'currentViewId'>) => {
  const createModelItem = useCallback(
    (newModelItem: ModelItem) => {
      const newState = reducers.createModelItem(newModelItem, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const updateModelItem = useCallback(
    (id: string, updates: Partial<ModelItem>) => {
      const newState = reducers.updateModelItem(id, updates, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const deleteModelItem = useCallback(
    (id: string) => {
      const newState = reducers.deleteModelItem(id, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const createViewItem = useCallback(
    (newViewItem: ViewItem) => {
      const newState = reducers.view({
        action: 'CREATE_VIEWITEM',
        payload: newViewItem,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateViewItem = useCallback(
    (id: string, updates: Partial<ViewItem>) => {
      const newState = reducers.view({
        action: 'UPDATE_VIEWITEM',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteViewItem = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_VIEWITEM',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  // Every object drawn with one icon redrawn with another, as one undo step.
  // Only the drawing changes: ports, connections and the rest are kept.
  const replaceIcon = useCallback(
    (fromIcon: string, toIcon: string, onlyIds?: string[]) => {
      const start = getState();
      const ids = start.model.items
        .filter((item) => {
          return (
            item.icon === fromIcon &&
            (onlyIds === undefined || onlyIds.includes(item.id))
          );
        })
        .map((item) => {
          return item.id;
        });
      if (!ids.length) return;
      const next = ids.reduce((state, id) => {
        return reducers.updateModelItem(id, { icon: toIcon }, state);
      }, start);
      setState(next);
    },
    [getState, setState]
  );

  return {
    createModelItem,
    updateModelItem,
    replaceIcon,
    deleteModelItem,
    createViewItem,
    updateViewItem,
    deleteViewItem
  };
};
