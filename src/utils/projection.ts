// Isometric projection helpers (matrix + zoom).
//
// These produce CSS-side artefacts: the affine matrix used to project
// a 2D grid into iso space, the matching `transform: matrix(...)`
// string, an arbitrary translate helper, and the clamped zoom-step
// arithmetic. None of these need the model store or any per-component
// state — they're pure functions of their inputs.
//
// Extracted from src/utils/renderer.ts under QUA4-07.

import { produce } from 'immer';
import { Coords, ProjectionOrientationEnum } from 'src/types';
import { clamp, roundToOneDecimalPlace } from './common';
import { ZOOM_INCREMENT, MAX_ZOOM, MIN_ZOOM } from 'src/config';

const isoProjectionBaseValues = [0.707, -0.409, 0.707, 0.409, 0, -0.816];

export const getIsoMatrix = (
  orientation?: keyof typeof ProjectionOrientationEnum
) => {
  switch (orientation) {
    case ProjectionOrientationEnum.Y:
      return produce(isoProjectionBaseValues, (draft) => {
        draft[1] = -draft[1];
        draft[2] = -draft[2];
      });
    case ProjectionOrientationEnum.X:
    default:
      return isoProjectionBaseValues;
  }
};

export const getIsoProjectionCss = (
  orientation?: keyof typeof ProjectionOrientationEnum
) => {
  const matrixTransformValues = getIsoMatrix(orientation);

  return `matrix(${matrixTransformValues.join(', ')})`;
};

export const getTranslateCSS = (translate: Coords = { x: 0, y: 0 }) => {
  return `translate(${translate.x}px, ${translate.y}px)`;
};

export const incrementZoom = (zoom: number) => {
  const newZoom = clamp(zoom + ZOOM_INCREMENT, MIN_ZOOM, MAX_ZOOM);
  return roundToOneDecimalPlace(newZoom);
};

export const decrementZoom = (zoom: number) => {
  const newZoom = clamp(zoom - ZOOM_INCREMENT, MIN_ZOOM, MAX_ZOOM);
  return roundToOneDecimalPlace(newZoom);
};
