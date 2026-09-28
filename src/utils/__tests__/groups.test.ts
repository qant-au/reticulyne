import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import * as reducers from 'src/stores/reducers';
import { validateModel } from 'src/schemas/validation';
import type { Model, View } from 'src/types';
import type { State } from 'src/stores/reducers/types';
import {
  clickTarget,
  groupBounds,
  groupChain,
  groupMatchingSelection,
  groupMembers
} from '../groups';

// ROADMAP 1.7. Four nodes and a rectangle; groups built through the
// reducers, as the UI does.
const baseView = (): View => {
  return {
    id: 'v',
    name: 'V',
    items: ['a', 'b', 'c', 'd'].map((id, i) => {
      return { id, tile: { x: i * 2, y: 0 } };
    }),
    rectangles: [{ id: 'r', from: { x: 0, y: 3 }, to: { x: 1, y: 4 } }],
    connectors: [],
    textBoxes: []
  };
};
const state = (view: View = baseView()): State => {
  const model: Model = {
    ...INITIAL_DATA,
    items: ['a', 'b', 'c', 'd'].map((id) => {
      return { id, name: id };
    }),
    views: [view]
  };
  return { model, scene: INITIAL_SCENE_STATE };
};
const ITEM = (id: string) => {
  return { type: 'ITEM' as const, id };
};
const group = (
  s: State,
  id: string,
  refs: ReturnType<typeof ITEM>[],
  parent?: string
) => {
  return reducers.view({
    action: 'CREATE_GROUP',
    payload: { group: { id, name: id, parentGroupId: parent }, refs },
    ctx: { viewId: 'v', state: s }
  });
};
const viewOf = (s: State) => {
  return s.model.views[0];
};

test('grouping sets membership and reads back', () => {
  const s = group(state(), 'g1', [ITEM('a'), ITEM('b')]);
  expect(groupMembers(viewOf(s), 'g1')).toEqual([ITEM('a'), ITEM('b')]);
  expect(validateModel(s.model)).toEqual([]);
});

test('a single thing is not grouped', () => {
  const before = state();
  expect(group(before, 'g1', [ITEM('a')]).model.views[0].groups).toBe(
    undefined
  );
});

test('grouping a group with a node nests it', () => {
  let s = group(state(), 'inner', [ITEM('a'), ITEM('b')]);
  // Selecting the inner group means selecting its members.
  s = group(s, 'outer', [ITEM('a'), ITEM('b'), ITEM('c')]);
  const v = viewOf(s);
  expect(groupChain(v, 'inner')).toEqual(['outer', 'inner']);
  expect(groupMembers(v, 'outer')).toEqual([ITEM('a'), ITEM('b'), ITEM('c')]);
  expect(
    v.items.find((i) => {
      return i.id === 'a';
    })?.parentGroupId
  ).toBe('inner');
  expect(
    v.items.find((i) => {
      return i.id === 'c';
    })?.parentGroupId
  ).toBe('outer');
});

test('a click selects the outermost group, then one level down while editing', () => {
  let s = group(state(), 'inner', [ITEM('a'), ITEM('b')]);
  s = group(s, 'outer', [ITEM('a'), ITEM('b'), ITEM('c')]);
  const v = viewOf(s);

  expect(clickTarget(v, ITEM('a'), null)).toEqual({
    groupId: 'outer',
    refs: [ITEM('a'), ITEM('b'), ITEM('c')],
    editingGroupId: null
  });
  expect(clickTarget(v, ITEM('a'), 'outer').groupId).toBe('inner');
  expect(clickTarget(v, ITEM('a'), 'inner')).toEqual({
    groupId: null,
    refs: [ITEM('a')],
    editingGroupId: 'inner'
  });
  // Clicking outside the group being edited leaves it.
  expect(clickTarget(v, ITEM('d'), 'outer')).toEqual({
    groupId: null,
    refs: [ITEM('d')],
    editingGroupId: null
  });
});

test('ungroup moves members up a level and keeps the rest', () => {
  let s = group(state(), 'inner', [ITEM('a'), ITEM('b')]);
  s = group(s, 'outer', [ITEM('a'), ITEM('b'), ITEM('c')]);
  s = reducers.view({
    action: 'UNGROUP',
    payload: { id: 'outer' },
    ctx: { viewId: 'v', state: s }
  });
  const v = viewOf(s);
  expect(
    v.groups?.map((g) => {
      return g.id;
    })
  ).toEqual(['inner']);
  expect(v.groups?.[0].parentGroupId).toBeUndefined();
  expect(
    v.items.find((i) => {
      return i.id === 'c';
    })?.parentGroupId
  ).toBeUndefined();
  expect(groupMembers(v, 'inner')).toEqual([ITEM('a'), ITEM('b')]);
});

test('deleting every member removes the group', () => {
  let s = group(state(), 'g1', [ITEM('a'), ITEM('b')]);
  for (const id of ['a', 'b']) {
    s = reducers.view({
      action: 'DELETE_VIEWITEM',
      payload: id,
      ctx: { viewId: 'v', state: s }
    });
  }
  expect(viewOf(s).groups).toEqual([]);
});

test('groupMatchingSelection finds the group a selection is', () => {
  const s = group(state(), 'g1', [ITEM('a'), ITEM('b')]);
  expect(groupMatchingSelection(viewOf(s), [ITEM('b'), ITEM('a')])).toBe('g1');
  expect(groupMatchingSelection(viewOf(s), [ITEM('a')])).toBeNull();
  // A connector in the selection (Ctrl+A) is not a member and is ignored.
  expect(
    groupMatchingSelection(viewOf(s), [
      ITEM('a'),
      { type: 'CONNECTOR', id: 'k' },
      ITEM('b')
    ])
  ).toBe('g1');
});

test('bounds cover the members, rectangles included', () => {
  const s = reducers.view({
    action: 'CREATE_GROUP',
    payload: {
      group: { id: 'g1' },
      refs: [ITEM('a'), { type: 'RECTANGLE', id: 'r' }]
    },
    ctx: { viewId: 'v', state: state() }
  });
  expect(groupBounds(viewOf(s), 'g1')).toEqual({
    from: { x: 0, y: 0 },
    to: { x: 1, y: 4 }
  });
});

test('validation rejects a missing group and a cycle', () => {
  const v = baseView();
  v.items[0].parentGroupId = 'nope';
  v.groups = [
    { id: 'x', parentGroupId: 'y' },
    { id: 'y', parentGroupId: 'x' }
  ];
  const types = validateModel(state(v).model).map((i) => {
    return i.type;
  });
  expect(types).toContain('INVALID_GROUP_REF');
  expect(types).toContain('GROUP_CYCLE');
});
