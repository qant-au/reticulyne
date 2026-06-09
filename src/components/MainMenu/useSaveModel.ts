// "Save" handler for the main menu (FEA5-03). Reads the latest model
// snapshot from the store, hands it to the host's onSave callback,
// and closes the menu. Follows the QUA4-09 / FEA4-04 pattern shared
// by useExportJson and useExportPdf.
//
// The onSave callback is stored on the UI-state store by Reticulyne.tsx
// (via uiStateActions.setOnSave) so this hook can reach it without
// prop-drilling. Identity churn is bounded — the only subscriber
// that reacts to its presence is the MainMenu render branch.

import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { modelFromModelStore } from 'src/utils';

export const useSaveModel = () => {
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );
  const onSave = useUiStateStore((state) => {
    return state.onSave;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    if (!onSave) {
      // Defensive — the MainMenu suppresses the entry when onSave is
      // undefined, so this branch shouldn't fire from a user click.
      // Kept as a guard in case a future menu change races the prop.
      console.warn(
        '[isoflow] "Save" menu entry clicked without an onSave callback wired. ' +
          'Pass <Reticulyne onSave={...} /> alongside listing "ACTION.SAVE" in mainMenuOptions.'
      );
      return;
    }
    onSave(model);
  }, [model, onSave, uiStateActions]);
};
