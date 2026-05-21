import { model as modelFixture } from 'src/fixtures/model';
import { Scene } from 'src/types';
import * as reducers from 'src/stores/reducers';

const VIEW_ID = 'view1';
const CONNECTOR_ID = 'connector1';

describe('connector reducers', () => {
  test('deleteConnector removes the scene cache entry keyed by the connector id', () => {
    const scene: Scene = {
      connectors: {
        [CONNECTOR_ID]: {
          path: {
            tiles: [],
            rectangle: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }
          }
        }
      },
      connectorOverlays: {},
      textBoxes: {}
    };

    const initialState = { model: modelFixture, scene };

    expect(initialState.scene.connectors[CONNECTOR_ID]).toBeDefined();

    const newState = reducers.view({
      action: 'DELETE_CONNECTOR',
      payload: CONNECTOR_ID,
      ctx: { viewId: VIEW_ID, state: initialState }
    });

    const remainingIds = (newState.model.views[0].connectors ?? []).map((c) => {
      return c.id;
    });
    expect(remainingIds).not.toContain(CONNECTOR_ID);

    // Scene cache entry must also be gone — the bug was that it was keyed
    // by the numeric array index, so the delete missed and the entry leaked.
    expect(newState.scene.connectors[CONNECTOR_ID]).toBeUndefined();
  });
});
