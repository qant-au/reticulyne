/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useIsoProjection } from '../useIsoProjection';
import {
  getTilePosition,
  getBoundingBox,
  getIsoProjectionCss
} from 'src/utils';
import { UNPROJECTED_TILE_SIZE } from 'src/config';

describe('useIsoProjection', () => {
  describe('gridSize', () => {
    test('single tile is 1x1', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
      });

      expect(result.current.gridSize).toEqual({ width: 1, height: 1 });
    });

    test('spans the inclusive Manhattan distance + 1', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({ from: { x: 0, y: 0 }, to: { x: 3, y: 5 } });
      });

      expect(result.current.gridSize).toEqual({ width: 4, height: 6 });
    });

    test('absolute-value semantics — from/to order does not matter', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({ from: { x: 4, y: 2 }, to: { x: 0, y: 0 } });
      });

      expect(result.current.gridSize).toEqual({ width: 5, height: 3 });
    });

    test('handles negative tile coordinates', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({
          from: { x: -2, y: -3 },
          to: { x: 1, y: 1 }
        });
      });

      expect(result.current.gridSize).toEqual({ width: 4, height: 5 });
    });
  });

  describe('pxSize', () => {
    test('is gridSize scaled by UNPROJECTED_TILE_SIZE', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({ from: { x: 0, y: 0 }, to: { x: 2, y: 4 } });
      });

      expect(result.current.pxSize).toEqual({
        width: 3 * UNPROJECTED_TILE_SIZE,
        height: 5 * UNPROJECTED_TILE_SIZE
      });
    });
  });

  describe('origin / position', () => {
    test('origin defaults to the bottom-left of the bounding box (index 3)', () => {
      const from = { x: 0, y: 0 };
      const to = { x: 4, y: 2 };
      const { result } = renderHook(() => {
        return useIsoProjection({ from, to });
      });

      const expectedOrigin = getBoundingBox([from, to])[3];
      const expectedPosition = getTilePosition({
        tile: expectedOrigin,
        origin: 'LEFT'
      });

      expect(result.current.position).toEqual(expectedPosition);
    });

    test('originOverride is used verbatim when supplied', () => {
      const override = { x: 7, y: -2 };
      const { result } = renderHook(() => {
        return useIsoProjection({
          from: { x: 0, y: 0 },
          to: { x: 4, y: 2 },
          originOverride: override
        });
      });

      const expectedPosition = getTilePosition({
        tile: override,
        origin: 'LEFT'
      });

      expect(result.current.position).toEqual(expectedPosition);
    });
  });

  describe('orientation', () => {
    test('orientation "Y" pins position from TOP, not LEFT', () => {
      const override = { x: 1, y: 2 };
      const { result } = renderHook(() => {
        return useIsoProjection({
          from: { x: 0, y: 0 },
          to: { x: 2, y: 2 },
          originOverride: override,
          orientation: 'Y'
        });
      });

      expect(result.current.position).toEqual(
        getTilePosition({ tile: override, origin: 'TOP' })
      );
    });

    test('orientation default falls back to "X" projection (LEFT-anchored)', () => {
      const override = { x: 1, y: 2 };
      const { result } = renderHook(() => {
        return useIsoProjection({
          from: { x: 0, y: 0 },
          to: { x: 2, y: 2 },
          originOverride: override
        });
      });

      expect(result.current.position).toEqual(
        getTilePosition({ tile: override, origin: 'LEFT' })
      );
    });

    test('css.transform matches the underlying iso projection helper', () => {
      const { result: xResult } = renderHook(() => {
        return useIsoProjection({
          from: { x: 0, y: 0 },
          to: { x: 1, y: 1 },
          orientation: 'X'
        });
      });
      const { result: yResult } = renderHook(() => {
        return useIsoProjection({
          from: { x: 0, y: 0 },
          to: { x: 1, y: 1 },
          orientation: 'Y'
        });
      });

      expect(xResult.current.css.transform).toBe(getIsoProjectionCss('X'));
      expect(yResult.current.css.transform).toBe(getIsoProjectionCss('Y'));
      expect(xResult.current.css.transform).not.toBe(
        yResult.current.css.transform
      );
    });
  });

  describe('css block', () => {
    test('css writes position, dimensions, and a top-left transform-origin', () => {
      const { result } = renderHook(() => {
        return useIsoProjection({ from: { x: 0, y: 0 }, to: { x: 1, y: 2 } });
      });

      expect(result.current.css).toMatchObject({
        position: 'absolute',
        left: result.current.position.x,
        top: result.current.position.y,
        width: `${result.current.pxSize.width}px`,
        height: `${result.current.pxSize.height}px`,
        transformOrigin: 'top left'
      });
    });
  });
});
