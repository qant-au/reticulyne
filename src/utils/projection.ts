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
import { clamp } from './common';
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

// Zoom in and out step through ONE ladder: the whole ZOOM_INCREMENT rungs
// from MIN_ZOOM to MAX_ZOOM, plus the level the zoom was last set to by
// anything other than a step (Fit, the wheel, a host). So from Fit's 64%
// in goes 64 -> 80 -> 100 and out retraces 100 -> 80 -> 64 exactly. Adding
// ZOOM_INCREMENT to the zoom instead made that 64 -> 84 -> 100 in and
// 100 -> 80 -> 60 out, because the clamp at 100 lost the offset (sweep
// 2026-09-30).
const toPercent = (zoom: number) => {
  return Math.round(zoom * 100) / 100;
};

export const zoomLadder = (anchor?: number | null): number[] => {
  const rungs: number[] = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM + 1e-9; z += ZOOM_INCREMENT) {
    rungs.push(toPercent(z));
  }
  if (anchor !== undefined && anchor !== null) {
    const a = toPercent(clamp(anchor, MIN_ZOOM, MAX_ZOOM));
    if (!rungs.includes(a)) {
      // The anchor replaces a rung closer than half a step, so no step is
      // a sliver: from Fit's 64% out goes to 40, not 60 (sweep 2026-09-30).
      // MIN_ZOOM and MAX_ZOOM stay, being the limits a step must reach.
      const near = (r: number) => {
        return (
          Math.abs(r - a) < ZOOM_INCREMENT / 2 - 1e-9 &&
          r !== toPercent(MIN_ZOOM) &&
          r !== toPercent(MAX_ZOOM)
        );
      };
      return [
        ...rungs.filter((r) => {
          return !near(r);
        }),
        a
      ].sort((x, y) => {
        return x - y;
      });
    }
  }
  return rungs.sort((a, b) => {
    return a - b;
  });
};

// `anchor` is the off-ladder level to keep on the ladder; when omitted the
// current zoom is kept, so a step from anywhere can be retraced.
export const incrementZoom = (zoom: number, anchor?: number | null) => {
  const z = toPercent(zoom);
  const next = zoomLadder(anchor ?? z).find((rung) => {
    return rung > z;
  });
  return next ?? toPercent(clamp(z, MIN_ZOOM, MAX_ZOOM));
};

export const decrementZoom = (zoom: number, anchor?: number | null) => {
  const z = toPercent(zoom);
  const lower = zoomLadder(anchor ?? z).filter((rung) => {
    return rung < z;
  });
  return lower.length > 0
    ? lower[lower.length - 1]
    : toPercent(clamp(z, MIN_ZOOM, MAX_ZOOM));
};
