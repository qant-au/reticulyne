// "Export as PDF" handler for the main menu. Reads the renderer DOM
// node from the ui-state store, hands it to the exportAsPdf helper
// (which rasters it via html-to-image and embeds the PNG in a
// jsPDF document), then closes the menu.
//
// Added under FEA4-04 of the fourth-pass review. Mirrors the
// useImportFile / useExportJson pattern established in QUA4-09 so
// MainMenu.tsx stays focused on rendering.

import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { exportAsPdf } from 'src/utils';

export const useExportPdf = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return useCallback(async () => {
    if (rendererEl) {
      await exportAsPdf(rendererEl);
    }
    uiStateActions.setIsMainMenuOpen(false);
  }, [rendererEl, uiStateActions]);
};
