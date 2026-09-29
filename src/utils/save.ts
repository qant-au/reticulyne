import type { Model, SaveHandler, SaveStatus } from 'src/types';

// One save path for the menu's Save, the pill's Retry and
// auto-save, so all three report the same status.

// FNV-1a over the model's JSON. Only used to compare "is this what was
// saved?", so a 32-bit hash of the serialised model is plenty and keeps
// the store from holding a second copy of a large diagram.
export const fingerprintModel = (model: Model): string => {
  const text = JSON.stringify(model);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36) + ':' + text.length.toString(36);
};

interface SaveDeps {
  getStatus: () => SaveStatus;
  setStatus: (patch: Partial<SaveStatus>) => void;
}

/**
 * Hand the model to the host and track the outcome. The fingerprint is
 * taken from the model as sent, so an edit made while the save is in
 * flight still leaves the diagram dirty afterwards. A second call while
 * one is in flight is ignored; auto-save re-arms once it settles.
 */
export const performSave = async (
  onSave: SaveHandler,
  model: Model,
  { getStatus, setStatus }: SaveDeps
): Promise<void> => {
  if (getStatus().state === 'saving') return;
  const fingerprint = fingerprintModel(model);
  setStatus({ state: 'saving', error: null });
  try {
    await onSave(model);
    setStatus({
      state: 'saved',
      lastSavedAt: Date.now(),
      savedFingerprint: fingerprint
    });
  } catch (err) {
    setStatus({
      state: 'error',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};
