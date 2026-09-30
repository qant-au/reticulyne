import {
  emptyScene,
  mergeScene,
  type Anchor as SceneAnchor,
  type Connection as SceneConnection,
  type Connector as SceneConnector,
  type DiagramView,
  type Scene,
  type SceneObject,
  type SceneUpdate
} from 'src/vendor/accurona-core';
import type {
  Connection,
  Connector,
  ConnectorAnchor,
  Group,
  Model,
  ModelItem,
  Rectangle,
  TextBox,
  View
} from 'src/types/model';
import { generateId } from 'src/utils/common';
import { CUSTOM_ICON_COLLECTION } from 'src/utils/iconUpload';

// Reticulyne's model <-> the Accurona scene format, the file format.
//
// The editor works on its own Model. A scene is what it opens and saves:
// on load the scene's iso and schematic views become Reticulyne views, and
// on save the model is merged back into the scene that was opened, so plan
// views, connections, object props, ports and links, and anything else
// Reticulyne does not show survive the round trip.

export type DiagramKind = DiagramView['kind'];

/** What a save needs to know about the scene the diagram came from. */
export interface SceneContext {
  /** The scene as it was loaded; a save is merged into it. */
  opened: Scene;
}

/** The context of a new diagram: an empty scene with a fresh id. */
export const freshSceneContext = (title?: string): SceneContext => {
  return { opened: emptyScene(generateId(), title) };
};

// Optional fields are written only when set, as the scene format asks.
const defined = <T extends object>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => {
      return v !== undefined;
    })
  ) as T;
};

// Reticulyne's schema takes a UTC date-time only; the scene format also
// allows an offset.
const utcDate = (date: string | undefined) => {
  if (date === undefined || /z$/i.test(date)) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

// --- Model -> scene ---------------------------------------------------

const anchorToScene = (anchor: ConnectorAnchor): SceneAnchor => {
  const { ref } = anchor;
  if (ref.item !== undefined) {
    return {
      id: anchor.id,
      ref: defined({ object: ref.item, side: ref.side })
    };
  }
  if (ref.anchor !== undefined) {
    return { id: anchor.id, ref: { anchor: ref.anchor } };
  }
  return { id: anchor.id, ref: { tile: ref.tile! } };
};

const connectorToScene = (c: Connector): SceneConnector => {
  return defined({
    id: c.id,
    anchors: c.anchors.map(anchorToScene),
    description: c.description,
    color: c.color,
    width: c.width,
    style: c.style,
    direction: c.direction,
    glyph: c.glyph,
    animated: c.animated,
    animationRate: c.animationRate,
    animationFlow: c.animationFlow,
    connection: c.connection,
    layer: c.layerId,
    locked: c.locked
  });
};

// A view's kind is on the view itself, so a view switched between iso and
// schematic in the editor saves as what it is now (lw-050).
const viewToScene = (view: View): DiagramView => {
  return defined({
    id: view.id,
    kind: view.kind ?? 'iso',
    name: view.name,
    description: view.description,
    lastUpdated: view.lastUpdated,
    placements: view.items.length
      ? view.items.map((item) => {
          return defined({
            object: item.id,
            tile: item.tile,
            labelHeight: item.labelHeight,
            group: item.parentGroupId,
            layer: item.layerId,
            locked: item.locked
          });
        })
      : undefined,
    connectors: view.connectors?.map(connectorToScene),
    rectangles: view.rectangles?.map((r: Rectangle) => {
      return defined({
        id: r.id,
        from: r.from,
        to: r.to,
        color: r.color,
        colorValue: r.colorValue,
        outlineColor: r.outlineColor,
        transparency: r.transparency,
        zIndex: r.zIndex,
        group: r.parentGroupId,
        layer: r.layerId,
        locked: r.locked
      });
    }),
    textBoxes: view.textBoxes?.map((t: TextBox) => {
      return defined({
        id: t.id,
        tile: t.tile,
        content: t.content,
        fontSize: t.fontSize,
        orientation: t.orientation,
        group: t.parentGroupId,
        layer: t.layerId,
        locked: t.locked
      });
    }),
    groups: view.groups?.map((g: Group) => {
      return defined({
        id: g.id,
        name: g.name,
        color: g.color,
        group: g.parentGroupId,
        collapsed: g.collapsed
      });
    })
  });
};

const itemToObject = (item: ModelItem): SceneObject => {
  return defined({
    id: item.id,
    name: item.name || undefined,
    description: item.description || undefined,
    icon: item.icon,
    element: item.element,
    props: item.props,
    ports: item.ports,
    links: item.links
  });
};

/** The model item for a scene object (lw-082: with what makes it a device). */
export const objectToModelItem = (object: SceneObject): ModelItem => {
  return defined({
    id: object.id,
    name: object.name ?? '',
    description: object.description,
    icon: object.icon,
    element: object.element,
    props: object.props,
    ports: object.ports,
    links: object.links
  });
};

/** Reticulyne's part of the scene, for `mergeScene`. */
export const modelToSceneUpdate = (
  model: Model,
  context: SceneContext
): SceneUpdate => {
  const { opened } = context;
  return {
    viewKinds: ['iso', 'schematic'],
    views: model.views.map(viewToScene),
    objects: model.items.map(itemToObject),
    objectFields: [
      'name',
      'description',
      'icon',
      'element',
      'props',
      'ports',
      'links'
    ],
    preserve: {
      connector: ['connection']
    },
    set: {
      title: model.title,
      description: model.description,
      // An empty list is left out when the opened scene had none, so a
      // scene without icons or colours saves without them.
      ...(model.icons.length || opened.icons ? { icons: model.icons } : {}),
      ...(model.colors.length || opened.colors ? { colors: model.colors } : {}),
      // lw-052: likewise for layers.
      ...(model.layers?.length || opened.layers
        ? { layers: model.layers ?? [] }
        : {})
    }
  };
};

const endObject = (anchor: SceneAnchor | undefined) => {
  return anchor && 'object' in anchor.ref ? anchor.ref.object : undefined;
};

/**
 * The scene's connections with the model's in place of Reticulyne's own
 * (lw-053). A connection between two of the model's items is Reticulyne's:
 * it is replaced by the model's copy, or dropped when the model no longer
 * has it. Any other connection (to an object on a plan, say) is kept. The
 * fields Reticulyne does not edit (ports, kind, props, links) are kept
 * from the opened scene while the ends are unchanged.
 */
const mergeConnections = (
  scene: Scene,
  model: Model
): SceneConnection[] | undefined => {
  const itemIds = new Set(
    model.items.map((item) => {
      return item.id;
    })
  );
  const objectIds = new Set(
    scene.objects.map((object) => {
      return object.id;
    })
  );
  const edited = new Map(
    (model.connections ?? [])
      .filter((c) => {
        return objectIds.has(c.from) && objectIds.has(c.to);
      })
      .map((c) => {
        return [c.id, c];
      })
  );
  const toScene = (c: Connection, opened?: SceneConnection) => {
    const sameEnds =
      opened !== undefined && opened.from === c.from && opened.to === c.to;
    const kept: Partial<SceneConnection> = sameEnds ? { ...opened } : {};
    delete kept.description;
    return defined({ ...kept, ...c }) as SceneConnection;
  };
  const written = new Set<string>();
  const merged = (scene.connections ?? []).flatMap((c) => {
    const ours = itemIds.has(c.from) && itemIds.has(c.to);
    if (!ours) return [c];
    const next = edited.get(c.id);
    if (!next) return [];
    written.add(c.id);
    return [toScene(next, c)];
  });
  edited.forEach((c, id) => {
    if (!written.has(id)) merged.push(toScene(c));
  });
  return merged.length || scene.connections ? merged : undefined;
};

/**
 * The scene to save: the model merged into the scene it was opened from.
 * A connector keeps the connection it draws only while its ends still
 * match that connection's objects; moving an end in Reticulyne detaches it.
 */
export const sceneFromModel = (model: Model, context: SceneContext): Scene => {
  const scene = mergeScene(context.opened, modelToSceneUpdate(model, context));
  if (scene.description === undefined) delete scene.description;
  const merged = mergeConnections(scene, model);
  if (merged) scene.connections = merged;
  else delete scene.connections;
  const connections = new Map(
    (scene.connections ?? []).map((c) => {
      return [c.id, c];
    })
  );
  // lw-083: mergeScene drops a connector's `connection` when the opened
  // scene did not have it; the model's connector says what it draws.
  const drawnBy = new Map(
    model.views.flatMap((view) => {
      return (view.connectors ?? []).flatMap((c) => {
        return c.connection === undefined ? [] : [[c.id, c.connection]];
      });
    }) as [string, string][]
  );
  scene.views = scene.views?.map((view) => {
    if (view.kind === 'plan' || !view.connectors) return view;
    return {
      ...view,
      connectors: view.connectors.map((drawn) => {
        const connection = drawn.connection ?? drawnBy.get(drawn.id);
        const c =
          connection === drawn.connection ? drawn : { ...drawn, connection };
        if (c.connection === undefined) return c;
        const conn = connections.get(c.connection);
        const a = endObject(c.anchors[0]);
        const b = endObject(c.anchors[c.anchors.length - 1]);
        const matches =
          conn !== undefined &&
          ((a === conn.from && b === conn.to) ||
            (a === conn.to && b === conn.from));
        if (matches) return c;
        const detached = { ...c };
        delete detached.connection;
        return detached;
      })
    };
  });
  return scene;
};

/**
 * The scene as a file carries it: the icons its objects use and the ones
 * uploaded into it, not the whole library the editor offers (about 2.6 MB
 * of icon packs in every file). Opening a file keeps the editor's library.
 */
export const leanIcons = (scene: Scene): Scene => {
  if (!scene.icons) return scene;
  const used = new Set(
    scene.objects.map((object) => {
      return object.icon;
    })
  );
  const icons = scene.icons.filter((icon) => {
    return used.has(icon.id) || icon.collection === CUSTOM_ICON_COLLECTION;
  });
  // Like colours, an empty list is left out.
  const lean: Scene = { ...scene, icons };
  if (!icons.length) delete lean.icons;
  return lean;
};

// --- Scene -> model ---------------------------------------------------

const anchorFromScene = (anchor: SceneAnchor): ConnectorAnchor => {
  const { ref } = anchor;
  if ('object' in ref) {
    return {
      id: anchor.id,
      ref: defined({ item: ref.object, side: ref.side })
    };
  }
  return { id: anchor.id, ref: { ...ref } };
};

const viewFromScene = (view: DiagramView): View => {
  return defined({
    id: view.id,
    // Absent means iso, so an iso view reads back exactly as it was.
    kind: view.kind === 'schematic' ? view.kind : undefined,
    name: view.name,
    description: view.description,
    lastUpdated: utcDate(view.lastUpdated),
    items: (view.placements ?? []).map((p) => {
      return defined({
        id: p.object,
        tile: p.tile,
        labelHeight: p.labelHeight,
        parentGroupId: p.group,
        layerId: p.layer,
        locked: p.locked
      });
    }),
    connectors: view.connectors?.map((c) => {
      return defined({
        id: c.id,
        description: c.description,
        color: c.color,
        width: c.width,
        style: c.style,
        direction: c.direction,
        glyph: c.glyph,
        animated: c.animated,
        animationRate: c.animationRate,
        animationFlow: c.animationFlow,
        anchors: c.anchors.map(anchorFromScene),
        connection: c.connection,
        layerId: c.layer,
        locked: c.locked
      });
    }),
    rectangles: view.rectangles?.map((r) => {
      return defined({
        id: r.id,
        color: r.color,
        colorValue: r.colorValue,
        outlineColor: r.outlineColor,
        transparency: r.transparency,
        zIndex: r.zIndex,
        from: r.from,
        to: r.to,
        parentGroupId: r.group,
        layerId: r.layer,
        locked: r.locked
      });
    }),
    textBoxes: view.textBoxes?.map((t) => {
      return defined({
        id: t.id,
        tile: t.tile,
        content: t.content,
        fontSize: t.fontSize,
        orientation: t.orientation,
        parentGroupId: t.group,
        layerId: t.layer,
        locked: t.locked
      });
    }),
    groups: view.groups?.map((g) => {
      return defined({
        id: g.id,
        name: g.name,
        color: g.color,
        parentGroupId: g.group,
        collapsed: g.collapsed
      });
    })
  });
};

/**
 * The Reticulyne model for a scene: its iso and schematic views, and the
 * objects placed in them. Plan views and unplaced objects are not shown,
 * and are kept by `sceneFromModel` on save.
 */
export const sceneToModel = (
  scene: Scene
): { model: Model; context: SceneContext } => {
  const diagramViews = (scene.views ?? []).filter(
    (view): view is DiagramView => {
      return view.kind !== 'plan';
    }
  );
  const placed = new Set(
    diagramViews.flatMap((view) => {
      return (view.placements ?? []).map((p) => {
        return p.object;
      });
    })
  );
  const items: ModelItem[] = scene.objects
    .filter((o) => {
      return placed.has(o.id);
    })
    .map(objectToModelItem);
  // lw-053: the connections between two of those items, whatever views
  // they are on. The rest stay in the scene and are kept on save.
  const connections: Connection[] | undefined = scene.connections
    ?.filter((c) => {
      return placed.has(c.from) && placed.has(c.to) && c.from !== c.to;
    })
    .map((c) => {
      return defined({
        id: c.id,
        from: c.from,
        to: c.to,
        fromPort: c.fromPort,
        toPort: c.toPort,
        kind: c.kind,
        description: c.description
      });
    });
  const model: Model = defined({
    title: scene.title ?? 'Untitled',
    description: scene.description,
    items,
    views: diagramViews.map(viewFromScene),
    icons: scene.icons ?? [],
    colors: scene.colors ?? [],
    layers: scene.layers,
    connections: connections?.length ? connections : undefined
  });
  return {
    model,
    context: { opened: scene }
  };
};
