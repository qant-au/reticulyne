import { produce } from 'immer';
import { model as modelFixture } from 'src/fixtures/model';
import { ItemReference } from 'src/types';
import * as reducers from 'src/stores/reducers';

const getModel = () => {
  return produce(modelFixture, (draft) => {
    draft.views[0].rectangles = [
      {
        id: 'rect1',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 }
      },
      {
        id: 'rect2',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 }
      },
      {
        id: 'rect3',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 }
      }
    ];
  });
};

const scene = {
  connectors: {},
  connectorOverlays: {},
  textBoxes: {}
};

describe('Layer ordering reducers works correctly', () => {
  test('Brings layer forwards correctly', () => {
    const model = getModel();
    const item: ItemReference = {
      type: 'RECTANGLE',
      id: 'rect3'
    };

    const result = reducers.view({
      action: 'CHANGE_LAYER_ORDER',
      payload: {
        action: 'BRING_FORWARD',
        item
      },
      ctx: {
        viewId: 'view1',
        state: { model, scene }
      }
    });

    expect(result.model.views[0].rectangles?.[1].id).toBe('rect3');
  });

  test('Brings layer to front correctly', () => {
    const model = getModel();
    const item: ItemReference = {
      type: 'RECTANGLE',
      id: 'rect3'
    };

    const result = reducers.view({
      action: 'CHANGE_LAYER_ORDER',
      payload: {
        action: 'BRING_TO_FRONT',
        item
      },
      ctx: {
        viewId: 'view1',
        state: { model, scene }
      }
    });

    expect(result.model.views[0].rectangles?.[0].id).toBe('rect3');
  });

  test('Sends layer backward correctly', () => {
    const model = getModel();
    const item: ItemReference = {
      type: 'RECTANGLE',
      id: 'rect1'
    };

    const result = reducers.view({
      action: 'CHANGE_LAYER_ORDER',
      payload: {
        action: 'SEND_BACKWARD',
        item
      },
      ctx: {
        viewId: 'view1',
        state: { model, scene }
      }
    });

    expect(result.model.views[0].rectangles?.[1].id).toBe('rect1');
  });

  test('Sends layer to back correctly', () => {
    const model = getModel();
    const item: ItemReference = {
      type: 'RECTANGLE',
      id: 'rect1'
    };

    const result = reducers.view({
      action: 'CHANGE_LAYER_ORDER',
      payload: {
        action: 'SEND_TO_BACK',
        item
      },
      ctx: {
        viewId: 'view1',
        state: { model, scene }
      }
    });

    expect(result.model.views[0].rectangles?.[2].id).toBe('rect1');
  });
});

// connectors, text boxes, group moves, nodes ignored.
const getModelWithAllKinds = () => {
  return produce(getModel(), (draft) => {
    draft.views[0].textBoxes = ['tb1', 'tb2', 'tb3', 'tb4'].map((id) => {
      return { id, tile: { x: 0, y: 0 }, content: id };
    });
  });
};

const order = (
  action: 'BRING_FORWARD' | 'SEND_BACKWARD' | 'BRING_TO_FRONT' | 'SEND_TO_BACK',
  targets: ItemReference[],
  model = getModelWithAllKinds()
) => {
  return reducers.view({
    action: 'CHANGE_LAYER_ORDER',
    payload: { action, items: targets },
    ctx: { viewId: 'view1', state: { model, scene } }
  }).model.views[0];
};

const ids = (arr?: { id: string }[]) => {
  return (arr ?? []).map((e) => {
    return e.id;
  });
};

describe('Layer ordering across kinds (1.3)', () => {
  test('orders connectors', () => {
    const view = order('BRING_TO_FRONT', [
      { type: 'CONNECTOR', id: 'connector2' }
    ]);
    expect(ids(view.connectors)).toEqual(['connector2', 'connector1']);
  });

  test('orders text boxes', () => {
    const view = order('SEND_TO_BACK', [{ type: 'TEXTBOX', id: 'tb1' }]);
    expect(ids(view.textBoxes)).toEqual(['tb2', 'tb3', 'tb4', 'tb1']);
  });

  test('a group moves as a block and keeps its relative order', () => {
    const tb = (id: string): ItemReference => {
      return { type: 'TEXTBOX', id };
    };
    expect(
      ids(order('BRING_TO_FRONT', [tb('tb4'), tb('tb2')]).textBoxes)
    ).toEqual(['tb2', 'tb4', 'tb1', 'tb3']);
    expect(
      ids(order('SEND_TO_BACK', [tb('tb1'), tb('tb3')]).textBoxes)
    ).toEqual(['tb2', 'tb4', 'tb1', 'tb3']);
    // Contiguous tb2+tb3 step forward together, past tb1.
    expect(
      ids(order('BRING_FORWARD', [tb('tb2'), tb('tb3')]).textBoxes)
    ).toEqual(['tb2', 'tb3', 'tb1', 'tb4']);
    expect(
      ids(order('SEND_BACKWARD', [tb('tb2'), tb('tb3')]).textBoxes)
    ).toEqual(['tb1', 'tb4', 'tb2', 'tb3']);
  });

  test('mixed kinds reorder within their own kind in one call', () => {
    const view = order('BRING_TO_FRONT', [
      { type: 'RECTANGLE', id: 'rect3' },
      { type: 'TEXTBOX', id: 'tb4' },
      { type: 'CONNECTOR', id: 'connector2' }
    ]);
    expect(view.rectangles?.[0].id).toBe('rect3');
    expect(view.textBoxes?.[0].id).toBe('tb4');
    expect(view.connectors?.[0].id).toBe('connector2');
  });

  test('nodes are depth-sorted, so an ITEM reference changes nothing', () => {
    const model = getModelWithAllKinds();
    const view = order(
      'BRING_TO_FRONT',
      [{ type: 'ITEM', id: 'node3' }],
      model
    );
    expect(ids(view.items)).toEqual(ids(model.views[0].items));
  });

  test('an unknown id still throws', () => {
    expect(() => {
      order('BRING_TO_FRONT', [{ type: 'TEXTBOX', id: 'nope' }]);
    }).toThrow();
  });
});
