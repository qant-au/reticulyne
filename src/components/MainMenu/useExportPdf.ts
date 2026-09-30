// "Export as PDF" handler for the main menu. Reads the renderer DOM
// node from the ui-state store, hands it to the exportAsPdf helper
// (which rasters it via html-to-image and embeds the PNG in a
// jsPDF document), then closes the menu.
//
// lw-052: the PDF is a picture of the canvas, which already leaves hidden
// layers out. The Redacted layer is shown on the canvas, so it is hidden
// for the capture unless the export opts in; a diagram with anything on
// it asks first (the EXPORT_PDF dialog).
//
// Added under FEA4-04 of the fourth-pass review. Mirrors the
// useImportFile / useExportJson pattern established in QUA4-09 so
// MainMenu.tsx stays focused on rendering.

import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { exportAsPdf, hasRedactedContent } from 'src/utils';
import { useModelStore } from 'src/stores/modelStore';

/** Captures the canvas as a PDF, with or without the Redacted layer. */
export const useDownloadPdf = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const title = useModelStore((state) => {
    return state.title;
  });

  return useCallback(
    async (includeRedacted: boolean) => {
      if (!rendererEl) return;
      // The PDF is a picture of the live canvas, so the pointer's hover
      // tile came out in it. Hide it for the capture, then put the tool
      // back as it was.
      const { mode } = uiStateActions.get();
      uiStateActions.setMode({ ...mode, showCursor: false });
      uiStateActions.setHideRedacted(!includeRedacted);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
      try {
        await exportAsPdf(rendererEl, undefined, title);
      } finally {
        uiStateActions.setHideRedacted(false);
        uiStateActions.setMode(mode);
      }
    },
    [rendererEl, uiStateActions, title]
  );
};

export const useExportPdf = () => {
  const views = useModelStore((state) => {
    return state.views;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const download = useDownloadPdf();

  return useCallback(async () => {
    uiStateActions.setIsMainMenuOpen(false);
    if (hasRedactedContent({ views })) {
      uiStateActions.setDialog('EXPORT_PDF');
      return;
    }
    await download(true);
  }, [views, uiStateActions, download]);
};
