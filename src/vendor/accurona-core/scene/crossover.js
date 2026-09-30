/** Every view that places `objectId`, in view order. */
export function objectPlaces(scene, objectId) {
    const places = [];
    for (const view of scene.views ?? []) {
        const base = { viewId: view.id, viewName: view.name, kind: view.kind };
        if (view.kind === 'plan') {
            const p = view.placements?.find((q) => q.object === objectId);
            if (!p)
                continue;
            const floor = view.floors.find((f) => f.id === p.floor);
            places.push({
                ...base,
                floorId: p.floor,
                ...(floor?.name ? { floorName: floor.name } : {}),
                x: p.x,
                y: p.y
            });
        }
        else {
            const p = view.placements?.find((q) => q.object === objectId);
            if (p)
                places.push({ ...base, tile: p.tile });
        }
    }
    return places;
}
/**
 * The objects another editor has placed that no view of `kinds` places yet:
 * what an editor drawing `kinds` can offer to place, keeping the object's id.
 * Objects in no view at all are left out; they belong to neither editor yet.
 */
export function placedOnlyElsewhere(scene, kinds) {
    const mine = new Set(kinds);
    const here = new Set();
    const elsewhere = new Set();
    for (const view of scene.views ?? []) {
        const into = mine.has(view.kind) ? here : elsewhere;
        for (const p of view.placements ?? [])
            into.add(p.object);
    }
    return scene.objects.filter((o) => elsewhere.has(o.id) && !here.has(o.id));
}
/**
 * The plan floors some objects are placed on, most objects first (ties in
 * plan and floor order). An editor passes the objects of a diagram view as it
 * stands, saved or not.
 */
export function floorsOf(scene, objects) {
    const wanted = new Set(objects);
    const out = [];
    for (const view of scene.views ?? []) {
        if (view.kind !== 'plan')
            continue;
        for (const floor of view.floors) {
            const count = (view.placements ?? []).filter((p) => p.floor === floor.id && wanted.has(p.object)).length;
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
    return out.sort((a, b) => b.count - a.count);
}
/**
 * Where a diagram view is on the building: the plan floors its objects are
 * on. A diagram per storey maps to that storey; a diagram of objects on no
 * plan maps to nothing. Empty for a plan view or an unknown id.
 */
export function diagramLocations(scene, diagramViewId) {
    const diagram = scene.views?.find((v) => v.id === diagramViewId && v.kind !== 'plan');
    return diagram
        ? floorsOf(scene, (diagram.placements ?? []).map((p) => p.object))
        : [];
}
