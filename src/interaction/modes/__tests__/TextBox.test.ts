/**
 * @jest-environment jsdom
 */
import { TextBox } from '../TextBox';
import { makeState } from './_helpers';

describe('TextBox mode', () => {
  afterEach(() => {
    document.body.style.cursor = '';
  });

  test('entry sets the window cursor to "crosshair"', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: null }
    });
    TextBox.entry?.(state);
    expect(document.body.style.cursor).toBe('crosshair');
  });

  test('exit restores the window cursor to "default"', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: null }
    });
    TextBox.exit?.(state);
    expect(document.body.style.cursor).toBe('default');
  });

  test('mousemove updates the in-flight textbox tile position', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: 'tb-1' },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 4, y: 7 } } }
    });

    TextBox.mousemove?.(state);

    expect(state.scene.updateTextBox).toHaveBeenCalledWith('tb-1', {
      tile: { x: 4, y: 7 }
    });
  });

  test('mousemove is a no-op when there is no in-flight textbox id', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: null }
    });

    TextBox.mousemove?.(state);
    expect(state.scene.updateTextBox).not.toHaveBeenCalled();
  });

  test('mouseup outside the renderer deletes the in-flight textbox (cancels the placement)', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: 'tb-1' },
      isRendererInteraction: false
    });

    TextBox.mouseup?.(state);

    expect(state.scene.deleteTextBox).toHaveBeenCalledWith('tb-1');
    expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  });

  test('mouseup inside the renderer commits: opens the item-controls inspector and reverts to CURSOR', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: 'tb-1' },
      isRendererInteraction: true
    });

    TextBox.mouseup?.(state);

    expect(state.scene.deleteTextBox).not.toHaveBeenCalled();
    expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith({
      type: 'TEXTBOX',
      id: 'tb-1'
    });
    expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  });

  test('mouseup is a no-op when mode.id is null', () => {
    const state = makeState({
      mode: { type: 'TEXTBOX', showCursor: true, id: null }
    });

    TextBox.mouseup?.(state);
    expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
    expect(state.scene.deleteTextBox).not.toHaveBeenCalled();
  });
});
