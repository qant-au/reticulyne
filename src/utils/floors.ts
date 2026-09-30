// lw-053: floors. A floor is one of the model's views, and the list is in
// floor order, lowest first. A connection whose two items are placed on
// different floors is drawn on each floor as a stub: a short riser from
// the item to a transition marker naming the other floor and item.
// Pure, so the canvas, the inspector and the tests share one rule.

import type { Connection, Coords, View } from 'src/types';
import { filterViewByLayers } from './layers';

export type StubDirection = 'up' | 'down';

export interface FloorStub {
  connectionId: string;
  /** The item on this floor the stub rises from. */
  itemId: string;
  tile: Coords;
  /** The item at the other end, and the floor it is on. */
  remoteItemId: string;
  remoteViewId: string;
  /** Up when the other floor is above this one. */
  direction: StubDirection;
  /** This stub's place among the item's stubs, and how many it has. */
  index: number;
  count: number;
}

/** The view `delta` floors from `viewId` (+1 is the floor above), if any. */
export const adjacentFloor = (
  views: Pick<View, 'id'>[],
  viewId: string,
  delta: number
): string | undefined => {
  const index = views.findIndex((v) => {
    return v.id === viewId;
  });
  if (index === -1) return undefined;
  return views[index + delta]?.id;
};

/**
 * The stubs on floor `viewId`: one for each connection with one item shown
 * on this floor and the other not on it but shown on another. When the
 * other item is on several floors, the nearest is named. Items on a hidden
 * (`leftOut`) layer count as not shown, at either end.
 */
export const floorStubs = (
  views: View[],
  viewId: string,
  connections: Connection[] | undefined,
  leftOut: ReadonlySet<string> = new Set()
): FloorStub[] => {
  if (!connections?.length) return [];
  const current = views.findIndex((v) => {
    return v.id === viewId;
  });
  if (current === -1) return [];

  // item id -> the floor indexes it is shown on
  const floorsOf = new Map<string, number[]>();
  const tiles = new Map<string, Coords>();
  views.forEach((view, index) => {
    filterViewByLayers(view, leftOut).items.forEach((item) => {
      floorsOf.set(item.id, [...(floorsOf.get(item.id) ?? []), index]);
      if (index === current) tiles.set(item.id, item.tile);
    });
  });

  const stubs: Omit<FloorStub, 'index' | 'count'>[] = [];
  connections.forEach((c) => {
    [
      [c.from, c.to],
      [c.to, c.from]
    ].forEach(([local, remote]) => {
      const tile = tiles.get(local);
      if (!tile || tiles.has(remote)) return;
      const nearest = (floorsOf.get(remote) ?? []).reduce<number | undefined>(
        (best, index) => {
          if (best === undefined) return index;
          return Math.abs(index - current) < Math.abs(best - current)
            ? index
            : best;
        },
        undefined
      );
      if (nearest === undefined) return;
      stubs.push({
        connectionId: c.id,
        itemId: local,
        tile,
        remoteItemId: remote,
        remoteViewId: views[nearest].id,
        direction: nearest > current ? 'up' : 'down'
      });
    });
  });

  const perItem = new Map<string, number>();
  stubs.forEach((stub) => {
    perItem.set(stub.itemId, (perItem.get(stub.itemId) ?? 0) + 1);
  });
  const seen = new Map<string, number>();
  return stubs.map((stub) => {
    const index = seen.get(stub.itemId) ?? 0;
    seen.set(stub.itemId, index + 1);
    return { ...stub, index, count: perItem.get(stub.itemId)! };
  });
};
