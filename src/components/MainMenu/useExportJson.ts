// "Export as JSON" handler for the main menu. Reads the latest model
// snapshot from the store, merges it into the scene it was opened from,
// writes that scene (the file format) to a Blob, and triggers a download
// via downloadFile(). Closes the menu afterwards.
//
// lw-052: what is on the Redacted layer is left out unless the export opts
// in, so a diagram with anything on it asks first (the EXPORT_JSON
// dialog); one with nothing on it downloads at once, as before.
//
// Extracted from MainMenu.tsx under QUA4-09. useShallow keeps the
// model selector from triggering a re-render on every reducer tick;
// the callback identity only churns when modelFromModelStore returns
// a structurally different object.

import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import {
  exportAsJSON,
  hasRedactedContent,
  modelFromModelStore
} from 'src/utils';
import { leanIcons, sceneFromModel } from 'src/scene/convert';
import { redactScene } from 'src/vendor/accurona-core';

/** Downloads the diagram's scene, with or without the Redacted layer. */
export const useDownloadJson = () => {
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return useCallback(
    (includeRedacted: boolean) => {
      const scene = sceneFromModel(model, uiStateActions.get().sceneContext);
      exportAsJSON(leanIcons(includeRedacted ? scene : redactScene(scene)));
    },
    [model, uiStateActions]
  );
};

export const useExportJson = () => {
  const views = useModelStore((state) => {
    return state.views;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const download = useDownloadJson();

  return useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    if (hasRedactedContent({ views })) {
      uiStateActions.setDialog('EXPORT_JSON');
      return;
    }
    download(true);
  }, [views, uiStateActions, download]);
};
