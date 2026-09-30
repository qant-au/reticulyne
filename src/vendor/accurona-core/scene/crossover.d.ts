import type { Scene, SceneObject, View } from './schema.js';
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
    tile?: {
        x: number;
        y: number;
    };
}
/** Every view that places `objectId`, in view order. */
export declare function objectPlaces(scene: Scene, objectId: string): ObjectPlace[];
/**
 * The objects another editor has placed that no view of `kinds` places yet:
 * what an editor drawing `kinds` can offer to place, keeping the object's id.
 * Objects in no view at all are left out; they belong to neither editor yet.
 */
export declare function placedOnlyElsewhere(scene: Scene, kinds: ViewKind[]): SceneObject[];
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
export declare function floorsOf(scene: Scene, objects: Iterable<string>): FloorLocation[];
/**
 * Where a diagram view is on the building: the plan floors its objects are
 * on. A diagram per storey maps to that storey; a diagram of objects on no
 * plan maps to nothing. Empty for a plan view or an unknown id.
 */
export declare function diagramLocations(scene: Scene, diagramViewId: string): FloorLocation[];
export {};
