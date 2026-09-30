// lw-061: a connector end can name the side of its node it leaves by.
// These pin the three places that have to agree on what a side means:
// the port under the pointer, the route, and the saved scene.

import {
  ANCHOR_SIDE_OFFSETS,
  PORT_SIDES,
  connectorPathTileToGlobal,
  getConnectorPath,
  getPortAt,
  getPortScreenPositions,
  getTilePosition
} from 'src/utils';
import { validateConnectorAnchor } from 'src/schemas/validation';
import { freshSceneContext, sceneFromModel, sceneToModel } from 'src/scene';
import { model as fixtureModel } from 'src/fixtures/model';
import type {
  AnchorSide,
  Connector,
  ConnectorAnchor,
  Coords,
  Model,
  View
} from 'src/types';

const screenView = (projection: 'iso' | 'schematic') => {
  return {
    zoom: 1,
    scroll: { position: { x: 0, y: 0 }, offset: { x: 0, y: 0 } },
    rendererSize: { width: 1000, height: 1000 },
    projection
  };
};

const makeView = (tiles: Record<string, Coords>): View => {
  return {
    id: 'view1',
    name: 'view1',
    items: Object.entries(tiles).map(([id, tile]) => {
      return { id, tile };
    }),
    connectors: [],
    rectangles: [],
    textBoxes: []
  };
};

const routeOf = (anchors: ConnectorAnchor[], view: View) => {
  const { tiles, rectangle } = getConnectorPath({ anchors, view });
  return tiles.map((t) => {
    return connectorPathTileToGlobal(t, rectangle.from);
  });
};

describe.each(['iso', 'schematic'] as const)('ports (%s)', (projection) => {
  test('each port sits half way to the tile its side faces', () => {
    const view = screenView(projection);
    const tile = { x: 2, y: -1 };
    const ports = getPortScreenPositions(tile, view);
    const centre = getTilePosition({ tile, projection });

    PORT_SIDES.forEach((side, i) => {
      const next = getTilePosition({
        tile: {
          x: tile.x + ANCHOR_SIDE_OFFSETS[side].x,
          y: tile.y + ANCHOR_SIDE_OFFSETS[side].y
        },
        projection
      });
      expect(ports[i].x).toBeCloseTo(
        view.rendererSize.width / 2 + (centre.x + next.x) / 2
      );
      expect(ports[i].y).toBeCloseTo(
        view.rendererSize.height / 2 + (centre.y + next.y) / 2
      );
    });
  });

  test('the port under the pointer names its side', () => {
    const view = screenView(projection);
    const node = { id: 'n', tile: { x: 0, y: 0 } };
    getPortScreenPositions(node.tile, view).forEach((p, i) => {
      expect(getPortAt(p, [node], view)).toEqual({
        node,
        side: PORT_SIDES[i]
      });
    });
  });
});

describe('routing an end with a side', () => {
  const view = makeView({ a: { x: 0, y: 0 }, b: { x: 4, y: 0 } });

  test('without a side the route is unchanged', () => {
    const route = routeOf(
      [
        { id: 'a1', ref: { item: 'a' } },
        { id: 'a2', ref: { item: 'b' } }
      ],
      view
    );
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route[route.length - 1]).toEqual({ x: 4, y: 0 });
  });

  test.each<[AnchorSide, Coords]>([
    ['+Y', { x: 0, y: 1 }],
    ['-Y', { x: 0, y: -1 }],
    ['-X', { x: -1, y: 0 }]
  ])('leaves by %s, then never crosses its own node again', (side, step) => {
    const route = routeOf(
      [
        { id: 'a1', ref: { item: 'a', side } },
        { id: 'a2', ref: { item: 'b' } }
      ],
      view
    );
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route[1]).toEqual(step);
    expect(
      route.slice(1).some((t) => {
        return t.x === 0 && t.y === 0;
      })
    ).toBe(false);
    expect(route[route.length - 1]).toEqual({ x: 4, y: 0 });
  });

  test('arrives by the side named on the far end', () => {
    const route = routeOf(
      [
        { id: 'a1', ref: { item: 'a' } },
        { id: 'a2', ref: { item: 'b', side: '+Y' } }
      ],
      view
    );
    expect(route[route.length - 1]).toEqual({ x: 4, y: 0 });
    expect(route[route.length - 2]).toEqual({ x: 4, y: 1 });
  });

  test('two adjacent ends facing each other join directly', () => {
    const route = routeOf(
      [
        { id: 'a1', ref: { item: 'a', side: '+X' } },
        { id: 'a2', ref: { item: 'b', side: '-X' } }
      ],
      makeView({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } })
    );
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]);
  });
});

describe('validating a side', () => {
  const view = makeView({ a: { x: 0, y: 0 } });
  const check = (anchor: ConnectorAnchor) => {
    const connector = { id: 'c', anchors: [anchor] } as Connector;
    return validateConnectorAnchor(anchor, {
      view,
      connector,
      allAnchors: [anchor]
    });
  };

  test('a side on an item end is valid', () => {
    expect(check({ id: 'x', ref: { item: 'a', side: '+X' } })).toEqual([]);
  });

  test('a side without an item is refused', () => {
    expect(
      check({ id: 'x', ref: { tile: { x: 0, y: 0 }, side: '+X' } })
    ).toEqual([expect.objectContaining({ type: 'INVALID_ANCHOR_REF' })]);
  });
});

test('a side survives saving to the scene format and opening it again', () => {
  const model = JSON.parse(JSON.stringify(fixtureModel)) as Model;
  const connector = model.views[0].connectors![0];
  connector.anchors[0].ref = { ...connector.anchors[0].ref, side: '-Y' };

  const scene = sceneFromModel(model, freshSceneContext());
  const saved = scene.views!.find((v) => {
    return v.id === model.views[0].id;
  }) as { connectors: { anchors: { ref: object }[] }[] };
  expect(saved.connectors[0].anchors[0].ref).toEqual(
    expect.objectContaining({ side: '-Y' })
  );

  const { model: reopened } = sceneToModel(scene);
  expect(reopened.views[0].connectors![0].anchors[0].ref.side).toBe('-Y');
  expect(reopened.views[0].connectors![0].anchors[1].ref.side).toBeUndefined();
});
