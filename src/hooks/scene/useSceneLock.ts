import { useCallback } from 'react';
import type { ItemReference } from 'src/types';
import * as reducers from 'src/stores/reducers';
import type { SceneCore } from './types';

// lw-069: lock and unlock. Each change is one undo step, saved with the
// diagram.
export const useSceneLock = ({
  getState,
  setState,
  currentViewId
}: Pick<SceneCore, 'getState' | 'setState' | 'currentViewId'>) => {
  const setItemsLocked = useCallback(
    (refs: ItemReference[] | 'all', locked: boolean) => {
      const before = getState();
      const next = reducers.setItemsLocked(before, currentViewId, refs, locked);
      if (next.model !== before.model) setState(next);
    },
    [getState, setState, currentViewId]
  );

  return { setItemsLocked };
};
