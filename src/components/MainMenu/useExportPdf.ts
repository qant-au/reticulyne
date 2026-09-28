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
import { useModelStore } from 'src/stores/modelStore';

export const useExportPdf = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const title = useModelStore((state) => {
    return state.title;
  });

  return useCallback(async () => {
    uiStateActions.setIsMainMenuOpen(false);
    if (!rendererEl) return;
    // The PDF is a picture of the live canvas, so the pointer's hover
    // tile came out in it. Hide it for the capture, then put the tool
    // back as it was.
    const { mode } = uiStateActions.get();
    uiStateActions.setMode({ ...mode, showCursor: false });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    try {
      await exportAsPdf(rendererEl, undefined, title);
    } finally {
      uiStateActions.setMode(mode);
    }
  }, [rendererEl, uiStateActions, title]);
};
