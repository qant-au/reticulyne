// "Export as JSON" handler for the main menu. Reads the latest model
// snapshot from the store, serialises it to a Blob, and triggers a
// download via file-saver. Closes the menu afterwards.
//
// Extracted from MainMenu.tsx under QUA4-09. useShallow keeps the
// model selector from triggering a re-render on every reducer tick;
// the callback identity only churns when modelFromModelStore returns
// a structurally different object.

import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { exportAsJSON, modelFromModelStore } from 'src/utils';

export const useExportJson = () => {
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return useCallback(() => {
    exportAsJSON(model);
    uiStateActions.setIsMainMenuOpen(false);
  }, [model, uiStateActions]);
};
