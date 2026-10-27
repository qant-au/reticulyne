import type { ZodIssue } from 'zod';
import { isSceneDocument, sceneSchema, type Scene } from 'src/core';
import { sceneToModel } from 'src/scene/convert';
import { fillMissingIcons, isMissingIcon } from 'src/icons/missing';
import { BUILTIN_ICON_PREFIX, drawingsToIcons } from 'src/icons/drawingIcons';
import type { Icon, Model } from 'src/types/model';

/** A scene the viewer cannot draw: not a scene, or not a valid one. */
export class ViewerError extends Error {
  readonly issues: ZodIssue[];

  constructor(message: string, issues: ZodIssue[] = []) {
    super(message);
    this.name = 'ViewerError';
    this.issues = issues;
  }
}

const parseInput = (input: unknown): unknown => {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new ViewerError(
      `The diagram is not valid JSON: ${(error as Error).message}`
    );
  }
};

export interface LoadedScene {
  scene: Scene;
  model: Model;
  /** Icon ids drawn as placeholders until the built-in drawings load. */
  pendingBuiltins: string[];
}

/**
 * A scene, validated through the scene schema as the editor reads it, and
 * its model. An icon the scene names but does not carry comes from `icons`,
 * else, for a built-in id, is a placeholder until `withBuiltins` replaces
 * it; any other is the missing-icon placeholder, as in the editor.
 */
export const loadScene = (input: unknown, icons: Icon[] = []): LoadedScene => {
  const data = parseInput(input);
  if (!isSceneDocument(data)) {
    throw new ViewerError(
      'Not a Reticulyne diagram: expected a scene with "format" and "version".'
    );
  }
  const { value } = fillMissingIcons(data, icons);
  const parsed = sceneSchema.safeParse(value);
  if (!parsed.success) {
    throw new ViewerError(
      'The diagram is not a valid Reticulyne scene.',
      parsed.error.issues
    );
  }
  const scene = parsed.data;
  const { model } = sceneToModel(scene);
  const pendingBuiltins = model.icons
    .filter((icon) => {
      return icon.id.startsWith(BUILTIN_ICON_PREFIX) && isMissingIcon(icon);
    })
    .map((icon) => {
      return icon.id;
    });
  return { scene, model, pendingBuiltins };
};

/** The model with the placeholders for built-in icons drawn properly. */
export const withBuiltins = (
  model: Model,
  drawings: Parameters<typeof drawingsToIcons>[0]
): Model => {
  const builtins = new Map(
    drawingsToIcons(drawings).map((icon) => {
      return [icon.id, icon];
    })
  );
  return {
    ...model,
    icons: model.icons.map((icon) => {
      return isMissingIcon(icon) ? (builtins.get(icon.id) ?? icon) : icon;
    })
  };
};

/** The built-in drawings, loaded only when a diagram uses one. */
// In the library builds this import stays external (webpack/drawings.js):
// the drawings ship once, as dist/drawings.js and dist/esm/drawings.mjs.
export const loadDrawings = async () => {
  const { DRAWINGS } = await import('src/icons/drawings');
  return DRAWINGS;
};
