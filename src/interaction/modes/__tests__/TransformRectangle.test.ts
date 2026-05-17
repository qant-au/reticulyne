/**
 * @jest-environment jsdom
 */
import { TransformRectangle } from '../Rectangle/TransformRectangle';
import { makeState, lastModeChange, type SceneShape } from './_helpers';
import type { Rectangle } from 'src/types';

const makeRectangleScene = (rect: Rectangle) => {
  const scene: Partial<SceneShape> = {
    rectangles: [
      {
        ...rect
        // The renderer adds RECTANGLE_DEFAULTS, but the reducer-facing
        // shape is just the Rectangle.
      }
    ] as unknown as SceneShape['rectangles']
  };
  return scene;
};

describe('TransformRectangle mode', () => {
  test('mouseup transitions back to CURSOR', () => {
    const state = makeState({
      mode: {
        type: 'RECTANGLE.TRANSFORM',
        showCursor: true,
        id: 'rect-1',
        selectedAnchor: null
      }
    });

    TransformRectangle.mouseup?.(state);

    expect(lastModeChange(state)).toEqual({
      type: 'CURSOR',
      mousedownItem: null,
      showCursor: true
    });
  });

  test('mousedown is intentionally a no-op (TransformAnchor.tsx fires it)', () => {
    const state = makeState({
      mode: {
        type: 'RECTANGLE.TRANSFORM',
        showCursor: true,
        id: 'rect-1',
        selectedAnchor: null
      }
    });

    TransformRectangle.mousedown?.(state);
    expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    expect(state.scene.updateRectangle).not.toHaveBeenCalled();
  });

  test('mousemove with no selectedAnchor is a no-op', () => {
    const rect: Rectangle = {
      id: 'rect-1',
      color: 'color1',
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 }
    };
    const state = makeState({
      mode: {
        type: 'RECTANGLE.TRANSFORM',
        showCursor: true,
        id: 'rect-1',
        selectedAnchor: null
      },
      mouse: {
        delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } }
      },
      scene: makeRectangleScene(rect)
    });

    TransformRectangle.mousemove?.(state);
    expect(state.scene.updateRectangle).not.toHaveBeenCalled();
  });

  test('mousemove dragging BOTTOM_RIGHT anchor pins TOP_LEFT and follows the mouse on the opposite corner', () => {
    // Naming convention notes (see src/utils/renderer.ts:563):
    //   * getBoundingBox returns corners in tile-y-low-first order:
    //     [0]={lowX,lowY}, [1]={highX,lowY}, [2]={highX,highY}, [3]={lowX,highY}
    //   * convertBoundsToNamedAnchors maps that to:
    //     BOTTOM_LEFT = bbox[0] = {lowX, lowY}
    //     BOTTOM_RIGHT = bbox[1] = {highX, lowY}
    //     TOP_RIGHT    = bbox[2] = {highX, highY}
    //     TOP_LEFT     = bbox[3] = {lowX, highY}
    //   That is iso-tile-coordinate-based, NOT screen-pixel-based —
    //   "BOTTOM" means y=low and "TOP" means y=high.
    const rect: Rectangle = {
      id: 'rect-1',
      color: 'color1',
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 }
    };
    const state = makeState({
      mode: {
        type: 'RECTANGLE.TRANSFORM',
        showCursor: true,
        id: 'rect-1',
        selectedAnchor: 'BOTTOM_RIGHT'
      },
      mouse: {
        position: { screen: { x: 0, y: 0 }, tile: { x: 8, y: 8 } },
        delta: { screen: { x: 1, y: 1 }, tile: { x: 1, y: 1 } }
      },
      scene: makeRectangleScene(rect)
    });

    TransformRectangle.mousemove?.(state);

    expect(state.scene.updateRectangle).toHaveBeenCalledTimes(1);
    const [id, update] = (state.scene.updateRectangle as jest.Mock).mock
      .calls[0];
    expect(id).toBe('rect-1');
    // namedBounds of [{0,0},{4,4}]: TOP_LEFT={0,4}, BOTTOM_RIGHT={4,0}.
    // Drag BOTTOM_RIGHT to (8,8): nextBounds([{0,4},{8,8}]) gives
    // TOP_LEFT={0,8}, BOTTOM_RIGHT={8,4}. The reducer writes those
    // into `from` and `to` respectively.
    expect(update.from).toEqual({ x: 0, y: 8 });
    expect(update.to).toEqual({ x: 8, y: 4 });
  });

  test('mousemove without tile delta is a no-op', () => {
    const rect: Rectangle = {
      id: 'rect-1',
      color: 'color1',
      from: { x: 0, y: 0 },
      to: { x: 4, y: 4 }
    };
    const state = makeState({
      mode: {
        type: 'RECTANGLE.TRANSFORM',
        showCursor: true,
        id: 'rect-1',
        selectedAnchor: 'BOTTOM_RIGHT'
      },
      mouse: {
        delta: { screen: { x: 1, y: 0 }, tile: { x: 0, y: 0 } } // tile unchanged
      },
      scene: makeRectangleScene(rect)
    });

    TransformRectangle.mousemove?.(state);
    expect(state.scene.updateRectangle).not.toHaveBeenCalled();
  });
});
