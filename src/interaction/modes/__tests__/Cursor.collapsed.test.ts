/**
 * @jest-environment jsdom
 */
import { Cursor } from '../Cursor';
import { makeState, lastModeChange, ref, type SceneShape } from './_helpers';
import { filterViewByCollapsedGroups } from 'src/utils';
import type { View } from 'src/types';

// lw-062: a collapsed group's box stands for its members. Group g holds
// node1 at (0,0) and node2 at (2,0); its box is at (1,0).
const fullView: View = {
  id: 'view1',
  name: 'View1',
  items: [
    { id: 'node1', tile: { x: 0, y: 0 }, parentGroupId: 'g' },
    { id: 'node2', tile: { x: 2, y: 0 }, parentGroupId: 'g' }
  ],
  groups: [{ id: 'g', collapsed: true }]
};

const scene = (): Partial<SceneShape> => {
  return {
    items: [],
    currentView: fullView,
    visibleView: filterViewByCollapsedGroups(fullView)
  } as Partial<SceneShape>;
};

const onBox = {
  position: { screen: { x: 0, y: 0 }, tile: { x: 1, y: 0 } }
};

const node1 = ref('ITEM', 'node1');
const node2 = ref('ITEM', 'node2');

describe('Cursor mode - lw-062 collapsed groups', () => {
  test('a click on the box selects every member, ready to drag', () => {
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: onBox,
      scene: scene()
    });

    Cursor.mousedown?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([
      node1,
      node2
    ]);
    expect(lastModeChange(state)).toEqual(
      expect.objectContaining({ mousedownItem: node1 })
    );
  });

  test('Shift+click on a selected box takes its members out again', () => {
    const other = ref('ITEM', 'other');
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: onBox,
      scene: scene(),
      selection: [other, node1, node2],
      modifiers: { shift: true }
    });

    Cursor.mousedown?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([other]);
  });

  test('a click beside the box is a click on empty canvas', () => {
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } } },
      scene: scene()
    });

    Cursor.mousedown?.(state);

    expect(state.uiState.actions.setSelection).not.toHaveBeenCalled();
    expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
  });
});
