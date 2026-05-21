import { produce } from 'immer';
import { model as modelFixture } from 'src/fixtures/model';
import { Scene } from 'src/types';
import * as reducers from 'src/stores/reducers';

const VIEW_ID = 'view1';
const TEXT_BOX_ID = 'textBox-regression';

const modelWithTextBox = produce(modelFixture, (draft) => {
  draft.views[0].textBoxes = [
    {
      id: TEXT_BOX_ID,
      tile: { x: 0, y: 0 },
      content: 'leaky',
      fontSize: 1
    }
  ];
});

describe('textBox reducers', () => {
  test('deleteTextBox removes the scene cache entry keyed by the textbox id', () => {
    const scene: Scene = {
      connectors: {},
      connectorOverlays: {},
      textBoxes: {
        [TEXT_BOX_ID]: { size: { width: 10, height: 1 } }
      }
    };

    const initialState = { model: modelWithTextBox, scene };

    expect(initialState.scene.textBoxes[TEXT_BOX_ID]).toBeDefined();

    const newState = reducers.view({
      action: 'DELETE_TEXTBOX',
      payload: TEXT_BOX_ID,
      ctx: { viewId: VIEW_ID, state: initialState }
    });

    const remainingIds = (newState.model.views[0].textBoxes ?? []).map((t) => {
      return t.id;
    });
    expect(remainingIds).not.toContain(TEXT_BOX_ID);

    // Scene cache entry must also be gone — before BUG5-01, deleteTextBox
    // spliced the model but never cleared the scene size cache, leaking
    // entries across long-lived sessions.
    expect(newState.scene.textBoxes[TEXT_BOX_ID]).toBeUndefined();
  });
});
