import type { Scene, SceneObject, View } from './schema';

// Crossover: one object on a floor plan and in a network diagram.
//
// An object placed in a plan view and in a diagram view is the same object,
// with the same id; nothing else links them. These read the links out of a
// scene, so each editor can show where its objects are in the other's views,
// offer the other's objects for placing, and say where on the building a
// diagram view is.

type ViewKind = View['kind'];

/** One place an object is drawn: a view, and where in it. */
export interface ObjectPlace {
  viewId: string;
  viewName: string;
  kind: ViewKind;
  /** Plan views: the floor the object is on. */
  floorId?: string;
  floorName?: string;
  /** Plan views: the centre of the footprint, mm. */
  x?: number;
  y?: number;
  /** Diagram views: the tile. */
  tile?: { x: number; y: number };
}

/** Every view that places `objectId`, in view order. */
export function objectPlaces(scene: Scene, objectId: string): ObjectPlace[] {
  const places: ObjectPlace[] = [];
  for (const view of scene.views ?? []) {
    const base = { viewId: view.id, viewName: view.name, kind: view.kind };
    if (view.kind === 'plan') {
      const p = view.placements?.find((q) => {
        return q.object === objectId;
      });
      if (!p) continue;
      const floor = view.floors.find((f) => {
        return f.id === p.floor;
      });
      places.push({
        ...base,
        floorId: p.floor,
        ...(floor?.name ? { floorName: floor.name } : {}),
        x: p.x,
        y: p.y
      });
    } else {
      const p = view.placements?.find((q) => {
        return q.object === objectId;
      });
      if (p) places.push({ ...base, tile: p.tile });
    }
  }
  return places;
}

/**
 * The objects another editor has placed that no view of `kinds` places yet:
 * what an editor drawing `kinds` can offer to place, keeping the object's id.
 * Objects in no view at all are left out; they belong to neither editor yet.
 */
export function placedOnlyElsewhere(
  scene: Scene,
  kinds: ViewKind[]
): SceneObject[] {
  const mine = new Set(kinds);
  const here = new Set<string>();
  const elsewhere = new Set<string>();
  for (const view of scene.views ?? []) {
    const into = mine.has(view.kind) ? here : elsewhere;
    for (const p of view.placements ?? []) into.add(p.object);
  }
  return scene.objects.filter((o) => {
    return elsewhere.has(o.id) && !here.has(o.id);
  });
}

/** A floor of a plan view, and how many of the given objects are on it. */
export interface FloorLocation {
  planViewId: string;
  planViewName: string;
  floorId: string;
  floorName?: string;
  count: number;
}

/**
 * The plan floors some objects are placed on, most objects first (ties in
 * plan and floor order). An editor passes the objects of a diagram view as it
 * stands, saved or not.
 */
export function floorsOf(
  scene: Scene,
  objects: Iterable<string>
): FloorLocation[] {
  const wanted = new Set(objects);
  const out: FloorLocation[] = [];
  for (const view of scene.views ?? []) {
    if (view.kind !== 'plan') continue;
    for (const floor of view.floors) {
      const count = (view.placements ?? []).filter((p) => {
        return p.floor === floor.id && wanted.has(p.object);
      }).length;
      if (count) {
        out.push({
          planViewId: view.id,
          planViewName: view.name,
          floorId: floor.id,
          ...(floor.name ? { floorName: floor.name } : {}),
          count
        });
      }
    }
  }
  // A stable sort, so a tie keeps plan and floor order.
  return out.sort((a, b) => {
    return b.count - a.count;
  });
}

/**
 * Where a diagram view is on the building: the plan floors its objects are
 * on. A diagram per storey maps to that storey; a diagram of objects on no
 * plan maps to nothing. Empty for a plan view or an unknown id.
 */
export function diagramLocations(
  scene: Scene,
  diagramViewId: string
): FloorLocation[] {
  const diagram = scene.views?.find((v) => {
    return v.id === diagramViewId && v.kind !== 'plan';
  });
  return diagram
    ? floorsOf(
        scene,
        (diagram.placements ?? []).map((p) => {
          return p.object;
        })
      )
    : [];
}
