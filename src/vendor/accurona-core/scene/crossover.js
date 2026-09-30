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
 * Where a diagram view is on the building: the plan floors its objects are
 * placed on, most objects first (ties in plan and floor order). A diagram per
 * floor maps to that floor; a diagram of objects on no plan maps to nothing.
 * `objects` narrows it to some of the diagram's objects, such as the ones on
 * a layer.
 */
export function diagramLocations(scene, diagramViewId, objects) {
    const diagram = scene.views?.find((v) => v.id === diagramViewId && v.kind !== 'plan');
    if (!diagram)
        return [];
    const placed = new Set((diagram.placements ?? []).map((p) => p.object));
    const wanted = objects
        ? new Set([...objects].filter((id) => placed.has(id)))
        : placed;
    const out = [];
    let order = 0;
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
                    count,
                    order
                });
            }
            order++;
        }
    }
    return out
        .sort((a, b) => b.count - a.count || a.order - b.order)
        .map(({ order: _order, ...location }) => location);
}
