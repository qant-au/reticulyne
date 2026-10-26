import type { ZodIssue } from 'zod';
import { isSceneDocument, sceneSchema, type Scene } from 'src/core';
import { initialDataSchema } from 'src/schemas/model';
import type { Icon, Model } from 'src/types/model';
import { fillMissingIcons, type MissingIcon } from 'src/icons/missing';
import {
  legacyModelToScene,
  normaliseLegacyModel,
  type LegacyModelOptions
} from './legacy';

/** Where to open a diagram: fit it to the screen, or open a given view. */
export interface LoadHints {
  fitToView?: boolean;
  view?: string;
}

export type SceneReadResult =
  | {
      ok: true;
      scene: Scene;
      hints: LoadHints;
      /** The icons the scene's objects name and nobody has (src/icons/missing.ts). */
      missingIcons: MissingIcon[];
    }
  | { ok: false; issues: ZodIssue[] };

export interface ReadOptions extends LegacyModelOptions {
  /**
   * The icons the editor has. Given, an icon a scene's objects name that the
   * scene does not carry is taken from here, else put in as a placeholder,
   * rather than the scene being refused. Left out, such a scene is invalid,
   * as `validateScene` says.
   */
  library?: Icon[];
}

/**
 * Anything a diagram can be opened from, as a validated scene: a scene, or
 * a Reticulyne model (read only, converted). A legacy model's `fitToView`
 * and `view` come back as hints, the view id following any id remapping.
 * Invalid input is refused whole, with the issues. `options` apply to a
 * legacy model only; a scene is read as it is.
 */
export const readScene = (
  data: unknown,
  id?: string,
  options: ReadOptions = {}
): SceneReadResult => {
  if (isSceneDocument(data)) {
    const { value, missing } = options.library
      ? fillMissingIcons(data, options.library)
      : { value: data, missing: [] };
    const result = sceneSchema.safeParse(value);
    return result.success
      ? { ok: true, scene: result.data, hints: {}, missingIcons: missing }
      : { ok: false, issues: result.error.issues };
  }
  const legacy = initialDataSchema.safeParse(data);
  if (!legacy.success) return { ok: false, issues: legacy.error.issues };
  const { fitToView, view, ...model } = legacy.data;
  const scene = legacyModelToScene(model as Model, id, options);
  // The conversion is meant to always produce a valid scene; if it did
  // not, refuse rather than open something that cannot be saved.
  const checked = sceneSchema.safeParse(scene);
  if (!checked.success) return { ok: false, issues: checked.error.issues };
  const hints: LoadHints = {};
  if (fitToView !== undefined) hints.fitToView = fitToView;
  if (view !== undefined) {
    hints.view = normaliseLegacyModel(model as Model).viewId(view);
  }
  return { ok: true, scene: checked.data, hints, missingIcons: [] };
};
