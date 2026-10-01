import { validateScene } from 'src/vendor/accurona-core';
import { ITEMS } from 'src/catalogue/items';
import { itemToSceneObject } from 'src/catalogue/place';
import { freshSceneContext, sceneFromModel, sceneToModel } from 'src/scene';
import { objectToModelItem } from 'src/scene/convert';
import * as reducers from 'src/stores/reducers';
import type { State } from 'src/stores/reducers/types';
import type { Connector, Model } from 'src/types';

// A connector between two items with catalogue ports draws a
// connection attached to a port on each; it lets go of it when its ends
// move and takes it along when it is deleted.

// Without the Accurona icon, which this model does not carry.
const placed = (itemId: string, id: string) => {
  const item = objectToModelItem(
    itemToSceneObject(
      ITEMS.find((i) => {
        return i.id === itemId;
      })!,
      id
    )
  );
  delete item.icon;
  return item;
};

const initial = (): State => {
  const model: Model = {
    title: 'Office',
    icons: [],
    colors: [],
    items: [
      placed('poe-switch-8', 'sw'),
      placed('ip-camera-dome', 'cam'),
      placed('ip-camera-dome', 'cam2'),
      { id: 'note', name: 'Plain node' }
    ],
    views: [
      {
        id: 'v',
        name: 'Network',
        items: [
          { id: 'sw', tile: { x: 0, y: 0 } },
          { id: 'cam', tile: { x: 4, y: 0 } },
          { id: 'cam2', tile: { x: 0, y: 4 } },
          { id: 'note', tile: { x: 4, y: 4 } }
        ]
      }
    ]
  };
  return {
    model,
    scene: { connectors: {}, connectorOverlays: {}, textBoxes: {} }
  };
};

const connector = (id: string, from: string, to: string): Connector => {
  return {
    id,
    anchors: [
      { id: `${id}-a`, ref: { item: from } },
      { id: `${id}-b`, ref: { item: to } }
    ]
  };
};

const create = (state: State, c: Connector) => {
  return reducers.view({
    action: 'CREATE_CONNECTOR',
    payload: c,
    ctx: { viewId: 'v', state }
  });
};

const drawn = (state: State, id: string) => {
  return state.model.views[0].connectors!.find((c) => {
    return c.id === id;
  })!;
};

describe('connectors attach to catalogue ports', () => {
  test('a connector between two devices draws a connection on free ports', () => {
    let state = create(initial(), connector('k1', 'sw', 'cam'));
    state = create(state, connector('k2', 'sw', 'cam2'));
    const [c1, c2] = state.model.connections!;
    expect(c1).toMatchObject({
      from: 'sw',
      fromPort: 'eth1',
      to: 'cam',
      kind: 'ethernet-copper'
    });
    expect(c2).toMatchObject({ from: 'sw', fromPort: 'eth2', to: 'cam2' });
    expect(drawn(state, 'k1').connection).toBe(c1.id);
    expect(drawn(state, 'k2').connection).toBe(c2.id);
  });

  test('a connector to an item without ports draws no connection', () => {
    const state = create(initial(), connector('k1', 'sw', 'note'));
    expect(state.model.connections).toBeUndefined();
    expect(drawn(state, 'k1').connection).toBeUndefined();
  });

  test('moving an end lets go of the connection and attaches afresh', () => {
    let state = create(initial(), connector('k1', 'sw', 'cam'));
    const before = state.model.connections![0].id;
    state = reducers.view({
      action: 'UPDATE_CONNECTOR',
      payload: { id: 'k1', anchors: connector('k1', 'sw', 'cam2').anchors },
      ctx: { viewId: 'v', state }
    });
    expect(state.model.connections).toHaveLength(1);
    expect(state.model.connections![0]).toMatchObject({
      from: 'sw',
      to: 'cam2',
      fromPort: 'eth1'
    });
    expect(state.model.connections![0].id).not.toBe(before);

    state = reducers.view({
      action: 'UPDATE_CONNECTOR',
      payload: { id: 'k1', anchors: connector('k1', 'sw', 'note').anchors },
      ctx: { viewId: 'v', state }
    });
    expect(state.model.connections).toBeUndefined();
    expect(drawn(state, 'k1').connection).toBeUndefined();
  });

  test('deleting the connector deletes its connection', () => {
    let state = create(initial(), connector('k1', 'sw', 'cam'));
    state = reducers.view({
      action: 'DELETE_CONNECTOR',
      payload: 'k1',
      ctx: { viewId: 'v', state }
    });
    expect(state.model.connections).toBeUndefined();
  });

  test('a port chosen in the inspector is kept, and the whole saves and reopens', () => {
    let state = create(initial(), connector('k1', 'sw', 'cam'));
    const id = state.model.connections![0].id;
    state = reducers.updateConnection(state, id, { fromPort: 'eth5' });
    const context = freshSceneContext('Office');
    const saved = sceneFromModel(state.model, context);
    const result = validateScene(saved);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(saved.connections).toEqual([
      expect.objectContaining({
        id,
        from: 'sw',
        fromPort: 'eth5',
        to: 'cam',
        kind: 'ethernet-copper'
      })
    ]);
    const view = saved.views!.find((v) => {
      return v.id === 'v';
    });
    expect(view && 'connectors' in view && view.connectors![0].connection).toBe(
      id
    );

    const reopened = sceneToModel(saved).model;
    expect(reopened.connections).toEqual([
      expect.objectContaining({ fromPort: 'eth5', kind: 'ethernet-copper' })
    ]);
    expect(reopened.views[0].connectors![0].connection).toBe(id);
  });
});
