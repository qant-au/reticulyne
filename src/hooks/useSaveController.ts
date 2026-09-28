import { useEffect, useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { fingerprintModel, performSave } from 'src/utils/save';
import type { Model } from 'src/types';

interface Args {
  model: Model;
  /** True once initial data (or a loadModel payload) has been applied. */
  isReady: boolean;
  autoSaveDebounce: number | false;
}

// ROADMAP 2.3, mounted once by App. Keeps `saveStatus.isDirty` current,
// treats a freshly loaded diagram as saved, runs opt-in auto-save, and
// warns before the tab closes on unsaved work. All of it is inert unless
// the host passed `onSave`: without a save target "unsaved" means nothing.
export const useSaveController = ({
  model,
  isReady,
  autoSaveDebounce
}: Args) => {
  const onSave = useUiStateStore((state) => {
    return state.onSave;
  });
  const saveStatus = useUiStateStore((state) => {
    return state.saveStatus;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const loadGeneration = useUiStateStore((state) => {
    return state.loadGeneration;
  });

  const fingerprint = useMemo(() => {
    return fingerprintModel(model);
  }, [model]);

  // Baseline: whatever just loaded counts as saved. Keyed on the load,
  // not on edits. isReady alone missed every load after the first (its
  // false and true land in one render), so a newly opened diagram kept
  // the previous one's baseline: "Unsaved changes" straight after New,
  // and "Saved 50 s ago" on a file just imported.
  useEffect(() => {
    if (!isReady) return;
    uiStateActions.setSaveStatus({
      state: 'idle',
      isDirty: false,
      lastSavedAt: null,
      savedFingerprint: fingerprintModel(model),
      error: null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, loadGeneration, uiStateActions]);

  const isDirty =
    saveStatus.savedFingerprint !== null &&
    fingerprint !== saveStatus.savedFingerprint;

  useEffect(() => {
    if (saveStatus.isDirty !== isDirty) {
      uiStateActions.setSaveStatus({ isDirty });
    }
  }, [isDirty, saveStatus.isDirty, uiStateActions]);

  // Opt-in auto-save: fire `autoSaveDebounce` ms after the last edit.
  // Re-arms when a save settles, so edits made mid-save are picked up.
  // Pauses after a failure until the user retries, rather than hammering
  // a failing backend.
  useEffect(() => {
    if (!onSave || autoSaveDebounce === false) return undefined;
    if (!isDirty || saveStatus.state === 'saving') return undefined;
    if (saveStatus.state === 'error') return undefined;
    const timer = setTimeout(() => {
      void performSave(onSave, model, {
        getStatus: uiStateActions.getSaveStatus,
        setStatus: uiStateActions.setSaveStatus
      });
    }, autoSaveDebounce);
    return () => {
      clearTimeout(timer);
    };
  }, [
    onSave,
    autoSaveDebounce,
    isDirty,
    saveStatus.state,
    model,
    uiStateActions
  ]);

  // The browser's own "leave site?" prompt; the text is not customisable.
  useEffect(() => {
    if (!onSave || !isDirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome honours preventDefault() alone only from v119; the browser
      // floor is 117 (README), so the legacy returnValue is still needed.
      // eslint-disable-next-line no-param-reassign
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [onSave, isDirty]);
};
