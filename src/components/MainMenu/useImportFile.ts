// File-picker → parseJson → useInitialDataManager.load(...) flow used
// by the "Open" entry in the main menu. The file is a scene (the file
// format) or a legacy Reticulyne model, which load() converts. Extracted under QUA4-09 so the
// MainMenu component stays focused on rendering.
//
// Returns a stable callback (its identity changes only when the
// underlying load / uiStateActions identities change). The popup is
// closed *after* the file picker click resolves so the user can dismiss
// the menu without dismissing the OS file-picker.

import { useCallback } from 'react';
import type { ZodIssue } from 'zod';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import type { InitialData } from 'src/types';
import { parseJson, type Scene } from 'src/vendor/accurona-core';

// Parse a string of imported JSON and hand the result to load(). On
// malformed input, surface the failure through the same console-
// prefixed channel useInitialDataManager uses for schema-validation
// fallbacks — before BUG5-05 the JSON.parse exception escaped
// uncaught inside the FileReader callback and the file picker
// silently did nothing. Schema-level failures continue to flow
// through useInitialDataManager's onValidationError pipeline (load
// itself runs zod safeParse on the payload).
//
// A malformed file also goes to the host's onValidationError when one is
// set (upstream isoflow #22): without it an embedder had no way to tell
// the user why Open did nothing. The issue is synthetic, since zod never
// saw the payload.
//
// Exported so tests can exercise the parse path without standing up
// the full picker + FileReader stack.
export const handleImportedJsonText = (
  raw: string | null,
  load: (data: Scene | InitialData) => void,
  onValidationError?: (issues: ZodIssue[]) => void
): void => {
  if (raw === null) {
    console.error('[reticulyne] imported file could not be read as text.');
    return;
  }
  let modelData: unknown;
  try {
    // parseJson drops __proto__, constructor and prototype keys, so a
    // file cannot reach an object's prototype.
    modelData = parseJson(raw);
  } catch (parseErr) {
    if (onValidationError) {
      onValidationError([
        { code: 'custom', message: 'Imported file is not valid JSON', path: [] }
      ]);
    } else {
      console.error('[reticulyne] imported file is not valid JSON:', parseErr);
    }
    return;
  }
  // The shape check happens in load(): a scene is validated as a scene,
  // anything else as a legacy model. The cast here just satisfies the
  // typed signature; an actually-wrong shape is routed to
  // onValidationError / the console fallback downstream.
  load(modelData as Scene | InitialData);
};

export const useImportFile = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const onValidationError = useUiStateStore((state) => {
    return state.onValidationError;
  });
  // The host's onValidationError hears a file that parses but is not a
  // diagram too: without it that went to the console only.
  const { load } = useInitialDataManager({ onValidationError });

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
        handleImportedJsonText(
          typeof raw === 'string' ? raw : null,
          load,
          onValidationError
        );
      };

      fileReader.onerror = () => {
        console.error(
          '[reticulyne] FileReader failed to read the imported file:',
          fileReader.error
        );
      };

      fileReader.readAsText(file);

      uiStateActions.resetUiState();
    };

    await fileInput.click();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, load, onValidationError]);
};
