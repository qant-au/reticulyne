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
import { Coords, Projection, ProjectionOrientationEnum } from 'src/types';
import { clamp, roundToOneDecimalPlace } from './common';
import {
  ZOOM_INCREMENT,
  MAX_ZOOM,
  MIN_ZOOM,
  PROJECTED_TILE_SIZE,
  SCHEMATIC_TILE_SIZE
} from 'src/config';

const isoProjectionBaseValues = [0.707, -0.409, 0.707, 0.409, 0, -0.816];

// The schematic view's matrices are the iso ones with the tile grid drawn
// flat: an unprojected x step is still one tile along +x (right on screen)
// and a y step one tile along -y (down), so anything laid out in
// unprojected space lands on the same tiles in both views. The Y
// orientation (u along -y, v along -x) is a quarter turn.
const schematicMatrices = {
  X: [1, 0, 0, 1, 0, 0],
  Y: [0, 1, -1, 0, 0, 0]
};

/** A tile's size on screen, at zoom 1, in the given projection. */
export const getProjectedTileSize = (projection: Projection = 'iso') => {
  return projection === 'schematic' ? SCHEMATIC_TILE_SIZE : PROJECTED_TILE_SIZE;
};

export const getIsoMatrix = (
  orientation?: keyof typeof ProjectionOrientationEnum,
  projection: Projection = 'iso'
) => {
  if (projection === 'schematic') {
    return orientation === ProjectionOrientationEnum.Y
      ? schematicMatrices.Y
      : schematicMatrices.X;
  }

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
  orientation?: keyof typeof ProjectionOrientationEnum,
  projection: Projection = 'iso'
) => {
  const matrixTransformValues = getIsoMatrix(orientation, projection);

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
