/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import Isoflow from '../Isoflow';
import { getConnectorPath } from 'src/utils/connector';
import type { InitialData, View } from 'src/types';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => {
            return false;
          }
        };
      }
    });
  }
});

afterEach(() => {
  cleanup();
});

// Two nodes 8 tiles apart on the same row. A third node sits at the
// midpoint — directly on the straight-line path that the connector
// would take if there were no obstacle awareness. With FEA7-02 the
// connector must bend around it.
const obstacleScenario: View = {
  id: 'view-1',
  name: 'View 1',
  items: [
    { id: 'node-a', tile: { x: 0, y: 0 } },
    { id: 'node-blocker', tile: { x: 4, y: 0 } },
    { id: 'node-b', tile: { x: 8, y: 0 } }
  ],
  connectors: [
    {
      id: 'connector-1',
      color: 'col-1',
      anchors: [
        { id: 'a-start', ref: { item: 'node-a' } },
        { id: 'a-end', ref: { item: 'node-b' } }
      ]
    }
  ]
};

const clearScenario: View = {
  ...obstacleScenario,
  items: [
    { id: 'node-a', tile: { x: 0, y: 0 } },
    { id: 'node-b', tile: { x: 8, y: 0 } }
  ]
};

const wrapInInitialData = (view: View): InitialData => {
  const itemIds = new Set(
    view.items?.map((i) => {
      return i.id;
    })
  );
  return {
    version: '',
    title: 'FEA7-02 fixture',
    icons: [],
    colors: [{ id: 'col-1', value: '#000000' }],
    items: Array.from(itemIds).map((id) => {
      return { id, name: id };
    }),
    views: [view]
  };
};

describe('FEA7-02 obstacle-aware connector routing', () => {
  test('connector bends around an item sitting on its straight-line path', () => {
    const path = getConnectorPath({
      anchors: obstacleScenario.connectors![0].anchors,
      view: obstacleScenario
    });
    // World tile (4, 0) hosts node-blocker. Convert each search-area-
    // local path tile back to world coords and assert none collides.
    const worldTiles = path.tiles.map((tile) => {
      return {
        x: tile.x + path.rectangle.from.x,
        y: tile.y + path.rectangle.from.y
      };
    });
    const hitsBlocker = worldTiles.some((tile) => {
      return tile.x === 4 && tile.y === 0;
    });
    expect(hitsBlocker).toBe(false);
  });

  test('blocked routing produces a different path than clear routing', () => {
    const blocked = getConnectorPath({
      anchors: obstacleScenario.connectors![0].anchors,
      view: obstacleScenario
    });
    const clear = getConnectorPath({
      anchors: clearScenario.connectors![0].anchors,
      view: clearScenario
    });
    // A* with diagonal-always may find a detour of the same length
    // (just bent off the straight line). The load-bearing assertion
    // is that the tile compositions differ — i.e. routing actually
    // responds to the obstacle rather than ignoring it.
    const serialise = (tiles: { x: number; y: number }[]) => {
      return tiles
        .map((t) => {
          return `${t.x},${t.y}`;
        })
        .join(' ');
    };
    expect(serialise(blocked.tiles)).not.toBe(serialise(clear.tiles));
  });

  test('anchor-item tiles are not treated as obstacles for their own connector', () => {
    // node-a and node-b ARE obstacles in the abstract, but the
    // connector terminates on them — they must be walkable for entry
    // and exit. Verify by asserting the path actually starts and
    // ends ON the anchor tiles (in world coords).
    const path = getConnectorPath({
      anchors: clearScenario.connectors![0].anchors,
      view: clearScenario
    });
    const first = {
      x: path.tiles[0].x + path.rectangle.from.x,
      y: path.tiles[0].y + path.rectangle.from.y
    };
    const last = {
      x: path.tiles[path.tiles.length - 1].x + path.rectangle.from.x,
      y: path.tiles[path.tiles.length - 1].y + path.rectangle.from.y
    };
    // The path uses inclusive endpoints; one end matches node-a's
    // tile (0,0) and the other matches node-b's tile (8,0).
    const endpoints = [first, last];
    const matchesA = endpoints.some((p) => {
      return p.x === 0 && p.y === 0;
    });
    const matchesB = endpoints.some((p) => {
      return p.x === 8 && p.y === 0;
    });
    expect(matchesA).toBe(true);
    expect(matchesB).toBe(true);
  });

  test('renders without error and produces a non-empty polyline', () => {
    const onError = jest.fn();
    const { container } = render(
      <Isoflow
        onError={onError}
        initialData={wrapInInitialData(obstacleScenario)}
      />
    );
    expect(onError).not.toHaveBeenCalled();
    const polylines = container.querySelectorAll('polyline');
    // Each connector renders two polylines (a halo + the line itself).
    expect(polylines.length).toBeGreaterThanOrEqual(2);
    // Both have a `points` attribute populated by the routed path.
    polylines.forEach((line) => {
      expect(line.getAttribute('points')?.trim().length ?? 0).toBeGreaterThan(
        0
      );
    });
  });
});
