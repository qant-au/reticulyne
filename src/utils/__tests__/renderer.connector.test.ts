// Lock-in tests for the connector coordinate system (BUG4-01).
//
// The pre-BUG4-01 code built getConnectorPath's `rectangle` as a
// high-to-low pair (from = highCorner, to = lowCorner). That forced
// normalisePositionFromOrigin to compute `origin - position` and
// connectorPathTileToGlobal to algebraically evaluate to `origin -
// tile`, which inverted the x-axis. Connector.tsx compensated with a
// `transform: 'scale(-1, 1)'` style on the rendered SVG.
//
// These tests assert the post-fix contract:
//
//   * rectangle is low-to-high (from.x <= to.x, from.y <= to.y)
//   * normalisePositionFromOrigin({ position, origin }) === position - origin
//   * connectorPathTileToGlobal(tile, origin) === origin + tile
//   * connectorPathTileToGlobal is the inverse of normalisePositionFromOrigin
//
// If a future change re-introduces a coordinate-flip anywhere in the
// chain, one of these will fail before the next visual regression has
// a chance to ship.

import {
  normalisePositionFromOrigin,
  connectorPathTileToGlobal,
  getConnectorPath
} from 'src/utils';
import { CONNECTOR_SEARCH_OFFSET } from 'src/config';
import type { ConnectorAnchor, View } from 'src/types';

const makeView = (itemTiles: { id: string; x: number; y: number }[]): View => {
  return {
    id: 'view1',
    name: 'view1',
    items: itemTiles.map(({ id, x, y }) => {
      return { id, tile: { x, y } };
    }),
    connectors: [],
    rectangles: [],
    textBoxes: []
  };
};

describe('connector coordinate system', () => {
  describe('normalisePositionFromOrigin', () => {
    test('returns position minus origin (conventional operand order)', () => {
      expect(
        normalisePositionFromOrigin({
          position: { x: 5, y: 7 },
          origin: { x: 2, y: 3 }
        })
      ).toEqual({ x: 3, y: 4 });
    });

    test('normalising a point at the origin yields zero', () => {
      const origin = { x: -3, y: -1 };
      expect(normalisePositionFromOrigin({ position: origin, origin })).toEqual(
        { x: 0, y: 0 }
      );
    });

    test('handles negative coordinates', () => {
      expect(
        normalisePositionFromOrigin({
          position: { x: -2, y: -2 },
          origin: { x: -5, y: -5 }
        })
      ).toEqual({ x: 3, y: 3 });
    });
  });

  describe('connectorPathTileToGlobal', () => {
    test('returns origin plus tile (inverse of normalisation)', () => {
      expect(connectorPathTileToGlobal({ x: 3, y: 4 }, { x: 2, y: 3 })).toEqual(
        { x: 5, y: 7 }
      );
    });

    test('round-trips through normalisePositionFromOrigin', () => {
      const origin = { x: -3, y: -1 };
      const world = { x: 2, y: 0 };
      const tile = normalisePositionFromOrigin({ position: world, origin });
      expect(connectorPathTileToGlobal(tile, origin)).toEqual(world);
    });

    test('a tile at (0,0) maps back to the origin itself', () => {
      const origin = { x: -3, y: -1 };
      expect(connectorPathTileToGlobal({ x: 0, y: 0 }, origin)).toEqual(origin);
    });
  });

  describe('getConnectorPath', () => {
    test('builds a low-to-high rectangle (BUG4-01 invariant)', () => {
      const view = makeView([
        { id: 'a', x: -2, y: 0 },
        { id: 'b', x: 2, y: 0 }
      ]);
      const anchors: ConnectorAnchor[] = [
        { id: 'a1', ref: { item: 'a' } },
        { id: 'a2', ref: { item: 'b' } }
      ];

      const { rectangle } = getConnectorPath({ anchors, view });

      // Conventional ordering: the `from` corner is min, `to` is max.
      expect(rectangle.from.x).toBeLessThanOrEqual(rectangle.to.x);
      expect(rectangle.from.y).toBeLessThanOrEqual(rectangle.to.y);
    });

    test('rectangle.from is the search-area low-corner (anchors bbox minus CONNECTOR_SEARCH_OFFSET)', () => {
      const view = makeView([
        { id: 'a', x: -2, y: 0 },
        { id: 'b', x: 2, y: 0 }
      ]);
      const anchors: ConnectorAnchor[] = [
        { id: 'a1', ref: { item: 'a' } },
        { id: 'a2', ref: { item: 'b' } }
      ];

      const { rectangle } = getConnectorPath({ anchors, view });

      // Anchors span x: [-2, 2], y: [0, 0].
      // Search-area expansion: ±CONNECTOR_SEARCH_OFFSET (={1,1}).
      // => low-corner x = -2 - 1 = -3, low-corner y = 0 - 1 = -1.
      expect(rectangle.from).toEqual({
        x: -2 - CONNECTOR_SEARCH_OFFSET.x,
        y: 0 - CONNECTOR_SEARCH_OFFSET.y
      });
      expect(rectangle.to).toEqual({
        x: 2 + CONNECTOR_SEARCH_OFFSET.x,
        y: 0 + CONNECTOR_SEARCH_OFFSET.y
      });
    });

    test('throws when fewer than two anchors are supplied', () => {
      const view = makeView([{ id: 'a', x: 0, y: 0 }]);
      const anchors: ConnectorAnchor[] = [{ id: 'a1', ref: { item: 'a' } }];

      expect(() => {
        return getConnectorPath({ anchors, view });
      }).toThrow(/Connector needs at least two anchors/);
    });

    test('anchors at vertical alignment produce a y-low-to-high rectangle', () => {
      // Regression guard: the fix must work on both axes.
      const view = makeView([
        { id: 'a', x: 0, y: -3 },
        { id: 'b', x: 0, y: 3 }
      ]);
      const anchors: ConnectorAnchor[] = [
        { id: 'a1', ref: { item: 'a' } },
        { id: 'a2', ref: { item: 'b' } }
      ];

      const { rectangle } = getConnectorPath({ anchors, view });

      expect(rectangle.from.y).toBeLessThanOrEqual(rectangle.to.y);
      expect(rectangle.from).toEqual({
        x: 0 - CONNECTOR_SEARCH_OFFSET.x,
        y: -3 - CONNECTOR_SEARCH_OFFSET.y
      });
      expect(rectangle.to).toEqual({
        x: 0 + CONNECTOR_SEARCH_OFFSET.x,
        y: 3 + CONNECTOR_SEARCH_OFFSET.y
      });
    });
  });
});
