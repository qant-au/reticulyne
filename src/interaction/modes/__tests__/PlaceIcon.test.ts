/**
 * @jest-environment jsdom
 */
import { PlaceIcon } from '../PlaceIcon';
import { makeState, lastModeChange } from './_helpers';

describe('PlaceIcon mode', () => {
  test('mousedown with no icon selected reverts to CURSOR and clears item-controls', () => {
    const state = makeState({
      mode: { type: 'PLACE_ICON', showCursor: true, id: null },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 1, y: 1 } } }
    });

    PlaceIcon.mousedown?.(state);

    expect(lastModeChange(state)).toEqual(
      expect.objectContaining({ type: 'CURSOR', showCursor: true })
    );
    expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
  });

  test('mousedown outside the renderer is ignored', () => {
    const state = makeState({
      mode: { type: 'PLACE_ICON', showCursor: true, id: null },
      isRendererInteraction: false
    });

    PlaceIcon.mousedown?.(state);
    expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
  });

  test('mouseup with a selected icon creates a model item AND a view item at the mouse tile, then clears id', () => {
    const state = makeState({
      mode: { type: 'PLACE_ICON', showCursor: true, id: 'icon-1' },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 3, y: 5 } } }
    });

    PlaceIcon.mouseup?.(state);

    expect(state.scene.createModelItem).toHaveBeenCalledTimes(1);
    const modelArg = (state.scene.createModelItem as jest.Mock).mock
      .calls[0][0];
    expect(modelArg).toEqual(
      expect.objectContaining({
        name: 'Untitled',
        icon: 'icon-1'
      })
    );

    expect(state.scene.createViewItem).toHaveBeenCalledTimes(1);
    const viewArg = (state.scene.createViewItem as jest.Mock).mock.calls[0][0];
    expect(viewArg.tile).toEqual({ x: 3, y: 5 });
    // The view-item id matches the model-item id so they reference each
    // other; we can't assert the generated UUID directly but the two
    // must agree.
    expect(viewArg.id).toBe(modelArg.id);

    // After commit the placement mode should reset its id back to null
    // so a subsequent click doesn't double-place.
    const lastSetMode = (state.uiState.actions.setMode as jest.Mock).mock
      .calls[0][0];
    expect(lastSetMode).toEqual(
      expect.objectContaining({ type: 'PLACE_ICON', id: null })
    );
  });

  test('mouseup with no icon selected does not create anything', () => {
    const state = makeState({
      mode: { type: 'PLACE_ICON', showCursor: true, id: null }
    });

    PlaceIcon.mouseup?.(state);
    expect(state.scene.createModelItem).not.toHaveBeenCalled();
    expect(state.scene.createViewItem).not.toHaveBeenCalled();
  });
});
