import {
  emptyScene,
  mergeScene,
  type Anchor as SceneAnchor,
  type Connector as SceneConnector,
  type DiagramView,
  type Scene,
  type SceneObject,
  type SceneUpdate
} from 'src/vendor/accurona-core';
import type {
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
// views, connections, object props, ports and links, layers and anything
// else Reticulyne does not show survive the round trip.

export type DiagramKind = DiagramView['kind'];

/** What a save needs to know about the scene the diagram came from. */
export interface SceneContext {
  /** The scene as it was loaded; a save is merged into it. */
  opened: Scene;
  /** The kind each loaded view had. A view not listed here is new: 'iso'. */
  viewKinds: Map<string, DiagramKind>;
}

/** The context of a new diagram: an empty scene with a fresh id. */
export const freshSceneContext = (title?: string): SceneContext => {
  return { opened: emptyScene(generateId(), title), viewKinds: new Map() };
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
  if (ref.item !== undefined)
    return { id: anchor.id, ref: { object: ref.item } };
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
    animationFlow: c.animationFlow
  });
};

const viewToScene = (view: View, kind: DiagramKind): DiagramView => {
  return defined({
    id: view.id,
    kind,
    name: view.name,
    description: view.description,
    lastUpdated: view.lastUpdated,
    placements: view.items.length
      ? view.items.map((item) => {
          return defined({
            object: item.id,
            tile: item.tile,
            labelHeight: item.labelHeight,
            group: item.parentGroupId
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
        group: r.parentGroupId
      });
    }),
    textBoxes: view.textBoxes?.map((t: TextBox) => {
      return defined({
        id: t.id,
        tile: t.tile,
        content: t.content,
        fontSize: t.fontSize,
        orientation: t.orientation,
        group: t.parentGroupId
      });
    }),
    groups: view.groups?.map((g: Group) => {
      return defined({
        id: g.id,
        name: g.name,
        color: g.color,
        group: g.parentGroupId
      });
    })
  });
};

const itemToObject = (item: ModelItem): SceneObject => {
  return defined({
    id: item.id,
    name: item.name || undefined,
    description: item.description || undefined,
    icon: item.icon
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
    views: model.views.map((view) => {
      return viewToScene(view, context.viewKinds.get(view.id) ?? 'iso');
    }),
    objects: model.items.map(itemToObject),
    objectFields: ['name', 'description', 'icon'],
    preserve: {
      placement: ['layer'],
      connector: ['connection', 'layer'],
      rectangle: ['layer'],
      textBox: ['layer']
    },
    set: {
      title: model.title,
      description: model.description,
      // An empty list is left out when the opened scene had none, so a
      // scene without icons or colours saves without them.
      ...(model.icons.length || opened.icons ? { icons: model.icons } : {}),
      ...(model.colors.length || opened.colors ? { colors: model.colors } : {})
    }
  };
};

const endObject = (anchor: SceneAnchor | undefined) => {
  return anchor && 'object' in anchor.ref ? anchor.ref.object : undefined;
};

/**
 * The scene to save: the model merged into the scene it was opened from.
 * A connector keeps the connection it draws only while its ends still
 * match that connection's objects; moving an end in Reticulyne detaches it.
 */
export const sceneFromModel = (model: Model, context: SceneContext): Scene => {
  const scene = mergeScene(context.opened, modelToSceneUpdate(model, context));
  if (scene.description === undefined) delete scene.description;
  const connections = new Map(
    (scene.connections ?? []).map((c) => {
      return [c.id, c];
    })
  );
  scene.views = scene.views?.map((view) => {
    if (view.kind === 'plan' || !view.connectors) return view;
    return {
      ...view,
      connectors: view.connectors.map((c) => {
        const conn =
          c.connection === undefined
            ? undefined
            : connections.get(c.connection);
        if (!conn) return c;
        const a = endObject(c.anchors[0]);
        const b = endObject(c.anchors[c.anchors.length - 1]);
        const matches =
          (a === conn.from && b === conn.to) ||
          (a === conn.to && b === conn.from);
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
  if ('object' in ref) return { id: anchor.id, ref: { item: ref.object } };
  return { id: anchor.id, ref: { ...ref } };
};

const viewFromScene = (view: DiagramView): View => {
  return defined({
    id: view.id,
    name: view.name,
    description: view.description,
    lastUpdated: utcDate(view.lastUpdated),
    items: (view.placements ?? []).map((p) => {
      return defined({
        id: p.object,
        tile: p.tile,
        labelHeight: p.labelHeight,
        parentGroupId: p.group
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
        anchors: c.anchors.map(anchorFromScene)
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
        parentGroupId: r.group
      });
    }),
    textBoxes: view.textBoxes?.map((t) => {
      return defined({
        id: t.id,
        tile: t.tile,
        content: t.content,
        fontSize: t.fontSize,
        orientation: t.orientation,
        parentGroupId: t.group
      });
    }),
    groups: view.groups?.map((g) => {
      return defined({
        id: g.id,
        name: g.name,
        color: g.color,
        parentGroupId: g.group
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
    .map((o) => {
      return defined({
        id: o.id,
        name: o.name ?? '',
        description: o.description,
        icon: o.icon
      });
    });
  const model: Model = defined({
    title: scene.title ?? 'Untitled',
    description: scene.description,
    items,
    views: diagramViews.map(viewFromScene),
    icons: scene.icons ?? [],
    colors: scene.colors ?? []
  });
  return {
    model,
    context: {
      opened: scene,
      viewKinds: new Map(
        diagramViews.map((view) => {
          return [view.id, view.kind];
        })
      )
    }
  };
};
