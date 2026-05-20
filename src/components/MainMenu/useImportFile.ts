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
import type { InitialData } from 'src/types';

// Parse a string of imported JSON and hand the result to load(). On
// malformed input, surface the failure through the same console-
// prefixed channel useInitialDataManager uses for schema-validation
// fallbacks — before BUG5-05 the JSON.parse exception escaped
// uncaught inside the FileReader callback and the file picker
// silently did nothing. Schema-level failures continue to flow
// through useInitialDataManager's onValidationError pipeline (load
// itself runs zod safeParse on the payload).
//
// Exported so tests can exercise the parse path without standing up
// the full picker + FileReader stack.
export const handleImportedJsonText = (
  raw: string | null,
  load: (data: InitialData) => void
): void => {
  if (raw === null) {
    console.error('[isoflow] imported file could not be read as text.');
    return;
  }
  let modelData: unknown;
  try {
    modelData = JSON.parse(raw);
  } catch (parseErr) {
    console.error('[isoflow] imported file is not valid JSON:', parseErr);
    return;
  }
  // The shape check happens in load() via zod safeParse. The cast
  // here just satisfies the typed signature; an actually-wrong shape
  // is routed to onValidationError / the console fallback downstream.
  load(modelData as InitialData);
};

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
        return;
      }

      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        const raw = e.target?.result;
        handleImportedJsonText(typeof raw === 'string' ? raw : null, load);
      };

      fileReader.onerror = () => {
        console.error(
          '[isoflow] FileReader failed to read the imported file:',
          fileReader.error
        );
      };

      fileReader.readAsText(file);

      uiStateActions.resetUiState();
    };

    await fileInput.click();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, load]);
};
