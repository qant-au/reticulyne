// Wheel/trackpad input interpretation (FEA5-01).
//
// Pure routing logic: decides whether a WheelEvent should zoom or pan
// and normalises across the three deltaModes browsers can emit
// (pixel / line / page). Keeping this stateless and side-effect-free
// lets the unit test drive the four combinations (plain wheel deltaY,
// plain wheel deltaX, Ctrl+wheel, Cmd+wheel) without spinning up a
// real interaction manager.
//
// The hook (useInteractionManager) owns the zoomBuffer accumulator
// across calls so a single trackpad swipe (many small pixel deltas
// at deltaMode=0) maps to one or two zoom steps instead of clamping
// straight to MIN/MAX_ZOOM — the same trick the original onScroll
// used. We thread that buffer through the helper for purity.

// Zoom thresholds: how much accumulated deltaY equals one zoom step.
// PIXELS_PER_STEP is tuned for trackpads; LINES_PER_STEP / PAGES_PER_STEP
// match the discrete wheel-click and page-jump conventions.
export const PIXELS_PER_STEP = 100;
export const LINES_PER_STEP = 1;
export const PAGES_PER_STEP = 1;

// Pan multipliers: line-mode wheel events carry deltas in lines and
// page-mode in pages. Multiply up to pixel-equivalent so a wheel click
// pans by a noticeable but not jarring amount.
export const PIXELS_PER_LINE = 40;
export const PIXELS_PER_PAGE = 800;

export interface WheelZoomAction {
  kind: 'zoom';
  // Signed integer step count. Positive = zoom in, negative = zoom out.
  // Zero is valid (sub-step accumulation, no action yet).
  steps: number;
  // The carried-over fractional buffer to thread into the next call.
  nextZoomBuffer: number;
}

export interface WheelPanAction {
  kind: 'pan';
  // Pixel-equivalent translation to apply to the viewport.
  // Sign convention: matches scene-translate-Y semantics, so the
  // caller just adds this to scroll.position. Positive deltaY (the
  // browser convention for "scroll content downward") yields a
  // NEGATIVE panDy, which decreases scroll.position.y and makes the
  // scene shift up on screen — revealing content below.
  panDx: number;
  panDy: number;
}

export type WheelAction = WheelZoomAction | WheelPanAction;

interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function interpretWheelEvent(
  e: WheelLike,
  zoomBuffer: number
): WheelAction {
  const isZoomGesture = e.ctrlKey || e.metaKey;

  if (isZoomGesture) {
    let stepDelta: number;
    switch (e.deltaMode) {
      case 1:
        stepDelta = e.deltaY / LINES_PER_STEP;
        break;
      case 2:
        stepDelta = e.deltaY / PAGES_PER_STEP;
        break;
      case 0:
      default:
        stepDelta = e.deltaY / PIXELS_PER_STEP;
        break;
    }
    let nextBuffer = zoomBuffer + stepDelta;
    let steps = 0;
    while (nextBuffer >= 1) {
      steps -= 1; // positive deltaY = wheel down = zoom out
      nextBuffer -= 1;
    }
    while (nextBuffer <= -1) {
      steps += 1; // negative deltaY = wheel up = zoom in
      nextBuffer += 1;
    }
    return { kind: 'zoom', steps, nextZoomBuffer: nextBuffer };
  }

  let pxX: number;
  let pxY: number;
  switch (e.deltaMode) {
    case 1:
      pxX = e.deltaX * PIXELS_PER_LINE;
      pxY = e.deltaY * PIXELS_PER_LINE;
      break;
    case 2:
      pxX = e.deltaX * PIXELS_PER_PAGE;
      pxY = e.deltaY * PIXELS_PER_PAGE;
      break;
    case 0:
    default:
      pxX = e.deltaX;
      pxY = e.deltaY;
      break;
  }

  // Subtract the delta so positive deltaY (browser "scroll content
  // down" semantic) shifts the scene UP on screen, revealing content
  // below the viewport — matches what users expect from modern
  // canvas tools (Figma, Miro, Excalidraw). `+ 0` normalises a
  // negative zero (from `-0`) to positive zero so downstream
  // arithmetic and tests don't have to special-case it.
  return { kind: 'pan', panDx: -pxX + 0, panDy: -pxY + 0 };
}
