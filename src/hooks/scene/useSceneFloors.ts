import { useCallback } from 'react';
import * as reducers from 'src/stores/reducers';
import type { ConnectionPortUpdate } from 'src/stores/reducers/floors';
import type { State } from 'src/stores/reducers/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useView } from 'src/hooks/useView';
import { adjacentFloor, generateId } from 'src/utils';
import type { SceneCore } from './types';

// lw-053: floors (the model's views, lowest first) and the connections
// that join items on different floors. Every change is one undo step, and
// saved with the diagram; showing another floor is navigation, not a
// change, so it makes no undo step.
export const useSceneFloors = ({
  getState,
  setState,
  currentViewId,
  currentView
}: Pick<
  SceneCore,
  'getState' | 'setState' | 'currentViewId' | 'currentView'
>) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { changeView } = useView();

  // A no-op returns the model unchanged, and makes no undo step.
  const apply = useCallback(
    (change: (state: State) => State): State => {
      const before = getState();
      const next = change(before);
      if (next.model !== before.model) setState(next);
      return next;
    },
    [getState, setState]
  );

  /** Shows another floor. The selection belongs to this one, so it goes. */
  const showFloor = useCallback(
    (viewId: string) => {
      const { model } = getState();
      if (
        viewId === currentViewId ||
        !model.views.some((v) => {
          return v.id === viewId;
        })
      ) {
        return;
      }
      uiStateActions.clearSelection();
      changeView(viewId, model);
    },
    [getState, currentViewId, uiStateActions, changeView]
  );

  /** Shows the floor `delta` floors away (+1 is the one above), if any. */
  const showAdjacentFloor = useCallback(
    (delta: number) => {
      const id = adjacentFloor(getState().model.views, currentViewId, delta);
      if (id) showFloor(id);
    },
    [getState, currentViewId, showFloor]
  );

  /**
   * Adds a floor above the others, drawn like the current one, and shows
   * it. Returns its id.
   */
  const addFloor = useCallback(
    (name: string): string => {
      const id = generateId();
      const next = apply((state) => {
        return reducers.view({
          action: 'CREATE_VIEW',
          payload: {
            name,
            ...(currentView.kind ? { kind: currentView.kind } : {})
          },
          ctx: { viewId: id, state }
        });
      });
      uiStateActions.clearSelection();
      changeView(id, next.model);
      return id;
    },
    [apply, currentView.kind, uiStateActions, changeView]
  );

  const renameFloor = useCallback(
    (viewId: string, name: string) => {
      apply((state) => {
        return reducers.view({
          action: 'UPDATE_VIEW',
          payload: { name },
          ctx: { viewId, state }
        });
      });
    },
    [apply]
  );

  /** Moves a floor up (+1) or down (-1) the building. */
  const moveFloor = useCallback(
    (viewId: string, delta: number) => {
      apply((state) => {
        const index = state.model.views.findIndex((v) => {
          return v.id === viewId;
        });
        return reducers.moveView(state, viewId, index + delta);
      });
    },
    [apply]
  );

  /**
   * Deletes a floor and what is on it. The last floor stays. Deleting the
   * floor on show shows the one below it (or above, from the lowest).
   */
  const deleteFloor = useCallback(
    (viewId: string) => {
      const { views } = getState().model;
      const index = views.findIndex((v) => {
        return v.id === viewId;
      });
      if (index === -1 || views.length <= 1) return;
      // Move off it first, so nothing ever draws a floor that is gone.
      if (viewId === currentViewId) {
        showFloor(views[index === 0 ? 1 : index - 1].id);
      }
      apply((state) => {
        return reducers.view({
          action: 'DELETE_VIEW',
          payload: undefined,
          ctx: { viewId, state }
        });
      });
    },
    [getState, apply, currentViewId, showFloor]
  );

  /** Joins two items (on different floors). Returns the connection's id. */
  const connectItems = useCallback(
    (from: string, to: string): string => {
      const id = generateId();
      apply((state) => {
        return reducers.addConnection(state, { id, from, to });
      });
      return id;
    },
    [apply]
  );

  const deleteConnection = useCallback(
    (id: string) => {
      apply((state) => {
        return reducers.deleteConnection(state, id);
      });
    },
    [apply]
  );

  // lw-083: a connection's ports and medium, chosen in the inspector.
  const updateConnection = useCallback(
    (id: string, updates: ConnectionPortUpdate) => {
      apply((state) => {
        return reducers.updateConnection(state, id, updates);
      });
    },
    [apply]
  );

  return {
    showFloor,
    showAdjacentFloor,
    addFloor,
    renameFloor,
    moveFloor,
    deleteFloor,
    connectItems,
    updateConnection,
    deleteConnection
  };
};
