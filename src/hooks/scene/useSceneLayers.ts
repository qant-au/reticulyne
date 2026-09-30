import { useCallback } from 'react';
import type { ItemReference, Layer } from 'src/types';
import * as reducers from 'src/stores/reducers';
import type { State } from 'src/stores/reducers/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { generateId } from 'src/utils';
import type { SceneCore } from './types';

// lw-052: add, rename, show/hide and delete layers, and put items on one.
// Every change is one undo step, and saved with the diagram.
export const useSceneLayers = ({
  getState,
  setState,
  currentViewId
}: Pick<SceneCore, 'getState' | 'setState' | 'currentViewId'>) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  // A no-op returns the model unchanged, and makes no undo step.
  const apply = useCallback(
    (change: (state: State) => State) => {
      const before = getState();
      const next = change(before);
      if (next.model !== before.model) setState(next);
    },
    [getState, setState]
  );

  /** Returns the new layer's id. */
  const addLayer = useCallback(
    (name: string): string => {
      const id = generateId();
      apply((state) => {
        return reducers.addLayer(state, { id, name });
      });
      return id;
    },
    [apply]
  );

  const updateLayer = useCallback(
    (id: string, updates: Partial<Pick<Layer, 'name' | 'visible'>>) => {
      apply((state) => {
        return reducers.updateLayer(state, id, updates);
      });
      // What is hidden cannot stay selected: the inspector would edit
      // something that is not on the canvas.
      if (updates.visible === false) {
        const view = getState().model.views.find((v) => {
          return v.id === currentViewId;
        });
        const onLayer = new Set(
          [
            ...(view?.items ?? []),
            ...(view?.connectors ?? []),
            ...(view?.rectangles ?? []),
            ...(view?.textBoxes ?? [])
          ]
            .filter((entry) => {
              return entry.layerId === id;
            })
            .map((entry) => {
              return entry.id;
            })
        );
        const { selection } = uiStateActions.get();
        if (
          selection.some((ref) => {
            return onLayer.has(ref.id);
          })
        ) {
          uiStateActions.setSelection([]);
          uiStateActions.setItemControls(null);
        }
      }
    },
    [apply, getState, currentViewId, uiStateActions]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      apply((state) => {
        return reducers.deleteLayer(state, id);
      });
    },
    [apply]
  );

  const setItemsLayer = useCallback(
    (refs: ItemReference[], layerId: string | undefined) => {
      apply((state) => {
        return reducers.setItemsLayer(state, currentViewId, refs, layerId);
      });
    },
    [apply, currentViewId]
  );

  const setLayerVisible = useCallback(
    (id: string, visible: boolean) => {
      updateLayer(id, { visible });
    },
    [updateLayer]
  );

  return {
    addLayer,
    updateLayer,
    deleteLayer,
    setItemsLayer,
    setLayerVisible
  };
};
