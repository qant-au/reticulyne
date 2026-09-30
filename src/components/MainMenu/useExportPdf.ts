// "Export as PDF" handler for the main menu. Reads the renderer DOM
// node from the ui-state store, hands it to the exportAsPdf helper
// (which rasters it via html-to-image and embeds the PNG in a
// jsPDF document), then closes the menu.
//
// Other floors' ghosts are hidden for the capture too, and put back after.
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
      const { mode, showOtherFloors } = uiStateActions.get();
      uiStateActions.setMode({ ...mode, showCursor: false });
      uiStateActions.setHideRedacted(!includeRedacted);
      // The faint other-floor ghosts are an editing aid, not the diagram:
      // they came out along the top of the PDF (sweep 2026-09-30). The PNG
      // and SVG exports render NON_INTERACTIVE, which never draws them.
      uiStateActions.setShowOtherFloors(false);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
      try {
        await exportAsPdf(rendererEl, undefined, title);
      } finally {
        uiStateActions.setShowOtherFloors(showOtherFloors);
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
    // A menu click has nowhere to send a rejection, so a failed capture
    // was an unhandled one and nothing else: say what went wrong.
    try {
      await download(true);
    } catch (err) {
      console.error('[reticulyne] PDF export failed:', err);
    }
  }, [views, uiStateActions, download]);
};
