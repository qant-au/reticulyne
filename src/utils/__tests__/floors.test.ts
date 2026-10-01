import type { Model, View } from 'src/types';
import { adjacentFloor, floorStubs, modelForExport } from 'src/utils';
import * as reducers from 'src/stores/reducers';
import { INITIAL_SCENE_STATE } from 'src/config';

// Floors are the views, lowest first.

const view = (
  id: string,
  items: { id: string; layerId?: string }[] = []
): View => {
  return {
    id,
    name: id.toUpperCase(),
    items: items.map((item, i) => {
      return { ...item, tile: { x: i, y: 0 } };
    })
  };
};

const building = () => {
  return [
    view('ground', [{ id: 'sw' }, { id: 'fw' }]),
    view('l1', [{ id: 'ap' }]),
    view('l2', [{ id: 'cam' }, { id: 'ap2', layerId: 'hidden' }])
  ];
};

describe('adjacentFloor', () => {
  test('the floor above, below, and none past the ends', () => {
    const views = building();
    expect(adjacentFloor(views, 'l1', 1)).toBe('l2');
    expect(adjacentFloor(views, 'l1', -1)).toBe('ground');
    expect(adjacentFloor(views, 'l2', 1)).toBeUndefined();
    expect(adjacentFloor(views, 'ground', -1)).toBeUndefined();
    expect(adjacentFloor(views, 'nope', 1)).toBeUndefined();
  });
});

describe('floorStubs', () => {
  test('a stub on each floor, pointing at the other', () => {
    const views = building();
    const connections = [{ id: 'c1', from: 'sw', to: 'ap' }];
    expect(floorStubs(views, 'ground', connections)).toEqual([
      {
        connectionId: 'c1',
        itemId: 'sw',
        tile: { x: 0, y: 0 },
        remoteItemId: 'ap',
        remoteViewId: 'l1',
        direction: 'up',
        index: 0,
        count: 1
      }
    ]);
    expect(floorStubs(views, 'l1', connections)).toEqual([
      expect.objectContaining({
        itemId: 'ap',
        remoteItemId: 'sw',
        remoteViewId: 'ground',
        direction: 'down'
      })
    ]);
    expect(floorStubs(views, 'l2', connections)).toEqual([]);
  });

  test('no stub when both ends are on the floor on show', () => {
    expect(
      floorStubs(building(), 'ground', [{ id: 'c', from: 'sw', to: 'fw' }])
    ).toEqual([]);
  });

  test('no stub when the other end is on no floor', () => {
    expect(
      floorStubs(building(), 'ground', [{ id: 'c', from: 'sw', to: 'gone' }])
    ).toEqual([]);
  });

  test('stubs on one item are numbered side by side', () => {
    const stubs = floorStubs(building(), 'ground', [
      { id: 'c1', from: 'sw', to: 'ap' },
      { id: 'c2', from: 'cam', to: 'sw' }
    ]);
    expect(
      stubs.map((s) => {
        return [s.connectionId, s.index, s.count, s.remoteViewId];
      })
    ).toEqual([
      ['c1', 0, 2, 'l1'],
      ['c2', 1, 2, 'l2']
    ]);
  });

  test('the nearest floor is named when the other item is on several', () => {
    const views = building();
    views[2].items.push({ id: 'ap', tile: { x: 5, y: 5 } });
    const [stub] = floorStubs(views, 'l2', [
      { id: 'c', from: 'cam', to: 'sw' }
    ]);
    expect(stub.remoteViewId).toBe('ground');
    views[1].items.push({ id: 'sw', tile: { x: 5, y: 5 } });
    const [nearer] = floorStubs(views, 'l2', [
      { id: 'c', from: 'cam', to: 'sw' }
    ]);
    expect(nearer.remoteViewId).toBe('l1');
  });

  test('an item on a hidden layer counts as not shown, at either end', () => {
    const views = building();
    const connections = [{ id: 'c', from: 'sw', to: 'ap2' }];
    expect(floorStubs(views, 'ground', connections)).toHaveLength(1);
    expect(
      floorStubs(views, 'ground', connections, new Set(['hidden']))
    ).toEqual([]);
  });
});

describe('floor reducers', () => {
  const state = () => {
    const model: Model = {
      title: 'T',
      items: [
        { id: 'sw', name: 'Switch' },
        { id: 'ap', name: 'AP' }
      ],
      views: building(),
      icons: [],
      colors: []
    };
    return { model, scene: INITIAL_SCENE_STATE };
  };

  test('addConnection adds once per pair, in either order', () => {
    const one = reducers.addConnection(state(), {
      id: 'c1',
      from: 'sw',
      to: 'ap'
    });
    expect(one.model.connections).toEqual([{ id: 'c1', from: 'sw', to: 'ap' }]);
    expect(
      reducers.addConnection(one, { id: 'c2', from: 'ap', to: 'sw' })
    ).toBe(one);
    expect(
      reducers.addConnection(one, { id: 'c3', from: 'sw', to: 'sw' })
    ).toBe(one);
  });

  test('deleteConnection removes it; an unknown id changes nothing', () => {
    const one = reducers.addConnection(state(), {
      id: 'c1',
      from: 'sw',
      to: 'ap'
    });
    expect(reducers.deleteConnection(one, 'c1').model.connections).toEqual([]);
    expect(reducers.deleteConnection(one, 'nope')).toBe(one);
  });

  test('moveView reorders, clamped to the ends', () => {
    const ids = (s: ReturnType<typeof state>) => {
      return s.model.views.map((v) => {
        return v.id;
      });
    };
    expect(ids(reducers.moveView(state(), 'ground', 1))).toEqual([
      'l1',
      'ground',
      'l2'
    ]);
    expect(ids(reducers.moveView(state(), 'l2', -5))).toEqual([
      'l2',
      'ground',
      'l1'
    ]);
    const s = state();
    expect(reducers.moveView(s, 'l2', 2)).toBe(s);
  });
});

describe('modelForExport', () => {
  test('a connection to an item left out of the export goes with it', () => {
    const model: Model = {
      title: 'T',
      items: [
        { id: 'sw', name: 'Switch' },
        { id: 'ap', name: 'AP' }
      ],
      views: [
        view('ground', [{ id: 'sw' }]),
        view('l1', [{ id: 'ap', layerId: 'redacted' }])
      ],
      icons: [],
      colors: [],
      connections: [{ id: 'c', from: 'sw', to: 'ap' }]
    };
    expect(
      modelForExport(model, { includeRedacted: false }).connections
    ).toEqual([]);
    expect(
      modelForExport(model, { includeRedacted: true }).connections
    ).toEqual(model.connections);
  });
});
