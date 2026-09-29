import { MIN_ZOOM, MAX_ZOOM } from 'src/config';
import type { Coords, Size } from 'src/types';

// two-finger pinch to zoom, with the midpoint panning.
// Pure maths, kept apart from the event plumbing in useInteractionManager
// (mirrors wheelInput.ts). Screen coordinates are relative to the
// renderer element; a scene point p sits at screen = size/2 + scroll + p*zoom.

export interface PinchStart {
  distance: number;
  zoom: number;
  /** The scene point under the midpoint when the pinch began. */
  anchor: Coords;
}

const midpoint = (a: Coords, b: Coords): Coords => {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

const distance = (a: Coords, b: Coords) => {
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const startPinch = (
  a: Coords,
  b: Coords,
  zoom: number,
  scroll: Coords,
  size: Size
): PinchStart => {
  const m = midpoint(a, b);
  return {
    distance: Math.max(1, distance(a, b)),
    zoom,
    anchor: {
      x: (m.x - size.width / 2 - scroll.x) / zoom,
      y: (m.y - size.height / 2 - scroll.y) / zoom
    }
  };
};

/**
 * Zoom scales with the finger spread (clamped to the editor's range), and
 * the scene point that started under the midpoint stays under it, so the
 * diagram follows the fingers: spreading zooms in about them, moving both
 * together pans.
 */
export const updatePinch = (
  start: PinchStart,
  a: Coords,
  b: Coords,
  size: Size
): { zoom: number; scroll: Coords } => {
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, (start.zoom * distance(a, b)) / start.distance)
  );
  const m = midpoint(a, b);
  return {
    zoom,
    scroll: {
      x: m.x - size.width / 2 - start.anchor.x * zoom,
      y: m.y - size.height / 2 - start.anchor.y * zoom
    }
  };
};
