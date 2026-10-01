import { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
import * as reducers from 'src/stores/reducers';
import type { Model, View } from 'src/types';
import type { State } from 'src/stores/reducers/types';
import {
  clipPathAtCollapsedBoxes,
  COLLAPSED_BOX_REACH,
  collapsedBoxAtTile,
  collapsedBoxes,
  collapsedGroupMembers,
  collapsedRoots,
  filterViewByCollapsedGroups,
  isInCollapsedGroup,
  reroutedPath
} from '../collapse';

// A rack group (a, b, a note and inner group "shelf" holding c)
// at x 0..4; an outside node z. k1 runs inside the rack (a-b), k2 from z
// into the rack (z-c), k3 hangs off k1's end anchor.
const view = (collapsed: { rack?: boolean; shelf?: boolean } = {}): View => {
  return {
    id: 'v',
    name: 'V',
    items: [
      { id: 'a', tile: { x: 0, y: 0 }, parentGroupId: 'rack' },
      { id: 'b', tile: { x: 4, y: 0 }, parentGroupId: 'rack' },
      { id: 'c', tile: { x: 2, y: 2 }, parentGroupId: 'shelf' },
      { id: 'z', tile: { x: 10, y: 0 } }
    ],
    connectors: [
      {
        id: 'k1',
        anchors: [
          { id: 'k1a', ref: { item: 'a' } },
          { id: 'k1b', ref: { item: 'b', side: '+X' } }
        ]
      },
      {
        id: 'k2',
        anchors: [
          { id: 'k2a', ref: { item: 'z' } },
          { id: 'k2b', ref: { item: 'c', side: '-Y' } }
        ]
      },
      {
        id: 'k3',
        anchors: [
          { id: 'k3a', ref: { anchor: 'k1b' } },
          { id: 'k3b', ref: { tile: { x: 6, y: 6 } } }
        ]
      }
    ],
    textBoxes: [
      {
        id: 'note',
        tile: { x: 0, y: 2 },
        content: 'Rack',
        parentGroupId: 'rack'
      }
    ],
    groups: [
      {
        id: 'rack',
        name: 'Rack',
        ...(collapsed.rack ? { collapsed: true } : {})
      },
      {
        id: 'shelf',
        parentGroupId: 'rack',
        ...(collapsed.shelf ? { collapsed: true } : {})
      }
    ]
  };
};

const ids = (list: { id: string }[] | undefined) => {
  return (list ?? []).map((e) => {
    return e.id;
  });
};

describe('filterViewByCollapsedGroups', () => {
  test('returns the same view when nothing is collapsed', () => {
    const v = view();
    expect(filterViewByCollapsedGroups(v)).toBe(v);
    expect(collapsedRoots(v)).toEqual([]);
  });

  test('a collapsed group hides its members at any depth and gets one box', () => {
    const out = filterViewByCollapsedGroups(view({ rack: true }));
    expect(ids(out.items)).toEqual(['z']);
    expect(ids(out.textBoxes)).toEqual([]);
    // The box is at the centre of the members' area, standing for all four.
    expect(collapsedBoxes(out)).toEqual([
      { groupId: 'rack', tile: { x: 2, y: 1 }, count: 4 }
    ]);
    expect(collapsedBoxAtTile(out, { x: 2, y: 1 })?.groupId).toBe('rack');
    expect(collapsedBoxAtTile(out, { x: 0, y: 0 })).toBeNull();
  });

  test('a connector inside the group is hidden, one from outside docks on the box', () => {
    const out = filterViewByCollapsedGroups(view({ rack: true }));
    // k1 is inside; k3 hangs off k1, so goes with it.
    expect(ids(out.connectors)).toEqual(['k2']);
    const k2 = out.connectors?.[0];
    expect(k2?.anchors[0].ref).toEqual({ item: 'z' });
    // The side belonged to the hidden node; the box has none.
    expect(k2?.anchors[1].ref).toEqual({ tile: { x: 2, y: 1 } });
    const path = reroutedPath(out, 'k2');
    expect(path?.tiles.length).toBeGreaterThan(0);
    expect(reroutedPath(out, 'k1')).toBeUndefined();
  });

  test('only the outermost collapsed group is drawn as a box', () => {
    const both = view({ rack: true, shelf: true });
    expect(collapsedRoots(both)).toEqual(['rack']);
    expect(isInCollapsedGroup(both, 'shelf')).toBe(true);
    const out = filterViewByCollapsedGroups(both);
    expect(
      collapsedBoxes(out).map((b) => {
        return b.groupId;
      })
    ).toEqual(['rack']);
  });

  test('a collapsed inner group leaves the rest of its parent shown', () => {
    const inner = view({ shelf: true });
    expect(isInCollapsedGroup(inner, 'rack')).toBe(false);
    const out = filterViewByCollapsedGroups(inner);
    expect(ids(out.items)).toEqual(['a', 'b', 'z']);
    expect(collapsedBoxes(out)).toEqual([
      { groupId: 'shelf', tile: { x: 2, y: 2 }, count: 1 }
    ]);
    // k2 docks on the shelf's box; k1 is between shown nodes and untouched.
    expect(ids(out.connectors)).toEqual(['k1', 'k2', 'k3']);
    expect(out.connectors?.[0].anchors).toEqual(view().connectors?.[0].anchors);
    expect(out.connectors?.[1].anchors[1].ref).toEqual({
      tile: { x: 2, y: 2 }
    });
  });

  test('selecting a box selects its unlocked members', () => {
    const v = view({ rack: true });
    v.items[1].locked = true;
    expect(collapsedGroupMembers(v, 'rack')).toEqual([
      { type: 'ITEM', id: 'a' },
      { type: 'ITEM', id: 'c' },
      { type: 'TEXTBOX', id: 'note' }
    ]);
  });
});

describe('collapsing a group', () => {
  const state = (): State => {
    const model: Model = {
      ...INITIAL_DATA,
      items: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
        { id: 'z', name: 'Z' }
      ],
      views: [view()]
    };
    return { model, scene: INITIAL_SCENE_STATE };
  };

  test('is one update, and expanding stores nothing', () => {
    const collapsed = reducers.view({
      action: 'UPDATE_GROUP',
      payload: { id: 'rack', collapsed: true },
      ctx: { viewId: 'v', state: state() }
    });
    expect(collapsed.model.views[0].groups?.[0]).toEqual({
      id: 'rack',
      name: 'Rack',
      collapsed: true
    });
    const expanded = reducers.view({
      action: 'UPDATE_GROUP',
      payload: { id: 'rack', collapsed: undefined },
      ctx: { viewId: 'v', state: collapsed }
    });
    expect(expanded.model.views[0].groups?.[0]).toEqual({
      id: 'rack',
      name: 'Rack'
    });
  });

  test('a patch can collapse a group', () => {
    expect(
      reducers.diagramPatchSchema.safeParse({
        groups: { rack: { collapsed: true } }
      }).success
    ).toBe(true);
    const next = reducers.applyDiagramPatch(
      { groups: { rack: { collapsed: true } } },
      'v',
      state()
    );
    expect(next.model.views[0].groups?.[0].collapsed).toBe(true);
  });
});

// Sweep 2026-09-30: a connector docked on a collapsed box ran on past its
// arrowhead at the box's edge to the box's centre.
describe('clipPathAtCollapsedBoxes', () => {
  const box = { groupId: 'g', tile: { x: 0, y: 0 }, count: 2 };
  test('an end on a box stops at the box edge', () => {
    const route = [
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 }
    ];
    const clipped = clipPathAtCollapsedBoxes(route, [box]);
    expect(clipped.slice(0, 3)).toEqual(route.slice(0, 3));
    expect(clipped[3].x).toBeCloseTo(COLLAPSED_BOX_REACH);
    expect(clipped[3].y).toBe(0);
    expect(route).toHaveLength(4);
  });

  test('a diagonal approach and a start on a box are clipped too', () => {
    const clipped = clipPathAtCollapsedBoxes(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
      ],
      [box]
    );
    expect(clipped).toHaveLength(3);
    expect(clipped[0].x).toBeCloseTo(COLLAPSED_BOX_REACH);
    expect(clipped[0].y).toBeCloseTo(COLLAPSED_BOX_REACH);
    expect(clipped.slice(1)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 }
    ]);
  });

  test('a route with no end on a box is unchanged', () => {
    const route = [
      { x: 5, y: 5 },
      { x: 6, y: 5 }
    ];
    expect(clipPathAtCollapsedBoxes(route, [box])).toEqual(route);
  });
});
