/**
 * @jest-environment jsdom
 */
import { Cursor } from '../Cursor';
import { makeState, lastModeChange, ref, type SceneShape } from './_helpers';
import { filterViewByCollapsedGroups, getTilePosition } from 'src/utils';
import type { Coords, View } from 'src/types';

// A collapsed group's box stands for its members. Group g holds
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

// Where a point in tile units is drawn on makeState's 1000 x 1000 canvas
// (zoom 1, no scroll): the box is found from the pointer on the screen.
const pointer = (at: Coords, tile: Coords) => {
  const p = getTilePosition({ tile: at });
  return { position: { screen: { x: 500 + p.x, y: 500 + p.y }, tile } };
};

const onBox = pointer({ x: 1, y: 0 }, { x: 1, y: 0 });

const node1 = ref('ITEM', 'node1');
const node2 = ref('ITEM', 'node2');

describe('Cursor mode - collapsed groups', () => {
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
      mouse: pointer({ x: -0.2, y: 0 }, { x: 0, y: 0 }),
      scene: scene()
    });

    Cursor.mousedown?.(state);

    expect(state.uiState.actions.setSelection).not.toHaveBeenCalled();
    expect(state.uiState.actions.setItemControls).toHaveBeenCalledWith(null);
  });

  // Sweep 2026-09-30: the box is drawn across most of its neighbouring
  // tiles, and a click off its centre tile selected nothing.
  test('a click anywhere on the box, not only its centre tile, selects it', () => {
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: pointer({ x: 1.8, y: -0.7 }, { x: 2, y: -1 }),
      scene: scene()
    });

    Cursor.mousedown?.(state);

    expect(state.uiState.actions.setSelection).toHaveBeenCalledWith([
      node1,
      node2
    ]);
  });

  // Sweep 2026-09-30: a connector from outside is drawn to the box's
  // centre. A press there grabbed the connector, and the drag pinned its
  // end to a bare tile instead of moving the group.
  const withConnector = (): Partial<SceneShape> => {
    const view: View = {
      ...fullView,
      items: [...fullView.items, { id: 'out', tile: { x: 4, y: 0 } }],
      connectors: [
        {
          id: 'k',
          anchors: [
            { id: 'a-out', ref: { item: 'out' } },
            { id: 'a-in', ref: { item: 'node1' } }
          ]
        }
      ]
    };
    const visible = filterViewByCollapsedGroups(view);
    return {
      items: visible.items,
      currentView: view,
      visibleView: visible,
      connectors: [
        {
          ...visible.connectors![0],
          path: {
            rectangle: { from: { x: 0, y: 0 }, to: { x: 5, y: 0 } },
            tiles: [
              { x: 1, y: 0 },
              { x: 2, y: 0 },
              { x: 3, y: 0 },
              { x: 4, y: 0 }
            ]
          }
        }
      ]
    } as unknown as Partial<SceneShape>;
  };

  test('a press on the box takes the group, not a connector drawn to it', () => {
    const state = makeState({
      mode: { type: 'CURSOR', showCursor: true, mousedownItem: null },
      mouse: onBox,
      scene: withConnector()
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

  test('a connector drawn to a collapsed box is not dragged by its end', () => {
    const state = makeState({
      mode: {
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: ref('CONNECTOR', 'k')
      },
      mouse: {
        position: { screen: { x: 0, y: 0 }, tile: { x: 1, y: 1 } },
        mousedown: { screen: { x: 0, y: 0 }, tile: { x: 1, y: 0 } },
        delta: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 1 } }
      },
      scene: withConnector()
    });

    Cursor.mousemove?.(state);

    expect(state.scene.updateConnector).not.toHaveBeenCalled();
    expect(state.uiState.actions.setMode).not.toHaveBeenCalled();
  });
});
