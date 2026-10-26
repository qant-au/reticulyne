import type { Model, SaveHandler, SaveStatus } from 'src/types';
import { validateScene } from 'src/core';
import {
  leanIcons,
  sceneFromModel,
  type SceneContext
} from 'src/scene/convert';
import { CUSTOM_ICON_COLLECTION } from 'src/utils/iconUpload';

// One save path for the menu's Save, the pill's Retry and
// auto-save, so all three report the same status. What is saved is a
// scene (the file format): the model merged into the scene it was opened
// from. The dirty check still fingerprints the model, which is what the
// user edits.

// FNV-1a over the model's JSON. Only used to compare "is this what was
// saved?", so a 32-bit hash of the serialised model is plenty and keeps
// the store from holding a second copy of a large diagram.
//
// The library the editor offers (built-in drawings, icon packs) is not the
// diagram's: like a saved file (leanIcons), the fingerprint counts only the
// icons the diagram uses and the ones uploaded into it, so a pack installed
// or synced after a load does not read as an unsaved change.
export const fingerprintModel = (model: Model): string => {
  const used = new Set(
    model.items.map((item) => {
      return item.icon;
    })
  );
  const text = JSON.stringify({
    ...model,
    icons: model.icons.filter((icon) => {
      return used.has(icon.id) || icon.collection === CUSTOM_ICON_COLLECTION;
    })
  });
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
  /** The scene the diagram was opened from, read at save time. */
  getSceneContext: () => SceneContext;
}

/**
 * Hand the diagram to the host, as a validated scene, and track the
 * outcome. The fingerprint is
 * taken from the model as sent, so an edit made while the save is in
 * flight still leaves the diagram dirty afterwards. A second call while
 * one is in flight is ignored; auto-save re-arms once it settles.
 */
export const performSave = async (
  onSave: SaveHandler,
  model: Model,
  { getStatus, setStatus, getSceneContext }: SaveDeps
): Promise<void> => {
  if (getStatus().state === 'saving') return;
  const fingerprint = fingerprintModel(model);
  setStatus({ state: 'saving', error: null });
  try {
    // An editor that writes an invalid scene has a bug; saving it would
    // lose work on the next open, so it is reported as a failed save.
    const checked = validateScene(
      leanIcons(sceneFromModel(model, getSceneContext()))
    );
    if (!checked.ok) {
      throw new Error(`The diagram is not a valid scene: ${checked.errors[0]}`);
    }
    await onSave(checked.scene);
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
