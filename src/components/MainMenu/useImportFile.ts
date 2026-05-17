// File-picker → JSON.parse → useInitialDataManager.load(...) flow used
// by the "Open" entry in the main menu. Extracted under QUA4-09 so the
// MainMenu component stays focused on rendering.
//
// Returns a stable callback (its identity changes only when the
// underlying load / uiStateActions identities change). The popup is
// closed *after* the file picker click resolves so the user can dismiss
// the menu without dismissing the OS file-picker.

import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';

export const useImportFile = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { load } = useInitialDataManager();

  return useCallback(async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (!file) {
        throw new Error('No file selected');
      }

      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        const modelData = JSON.parse(e.target?.result as string);
        load(modelData);
      };
      fileReader.readAsText(file);

      uiStateActions.resetUiState();
    };

    await fileInput.click();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, load]);
};
