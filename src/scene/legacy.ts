import {
  SCENE_FORMAT,
  SCENE_VERSION,
  isAllowedIconUrl,
  type Scene
} from 'src/vendor/accurona-core';
import type { Model } from 'src/types/model';
import { generateId } from 'src/utils/common';
import { REDACTED_LAYER_ID } from 'src/schemas/layer';
import { sceneFromModel } from './convert';

// Reading a Reticulyne model (the file format before the scene format).
// Models are read, never written: a legacy file becomes a scene on load,
// and from then on the editor works on, and saves, the scene.

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A scene-format id for any string: invalid characters become '_'. */
export const sceneSafeId = (id: string): string => {
  return id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'id';
};

// Maps one collection's ids to valid, unique ones. Ids that are already
// valid keep their value; the others are sanitised, truncated and, on a
// collision, given a -2, -3... suffix. Deterministic for a given order.
const idMap = (ids: string[]) => {
  const map = new Map<string, string>();
  const used = new Set<string>();
  ids.forEach((id) => {
    if (ID.test(id) && !map.has(id)) {
      map.set(id, id);
      used.add(id);
    }
  });
  ids.forEach((id) => {
    if (map.has(id)) return;
    const base = sceneSafeId(id);
    let candidate = base;
    for (let n = 2; used.has(candidate); n += 1) {
      const suffix = `-${n}`;
      candidate = base.slice(0, 64 - suffix.length) + suffix;
    }
    map.set(id, candidate);
    used.add(candidate);
  });
  return (id: string) => {
    return map.get(id) ?? sceneSafeId(id);
  };
};

const ids = (list: { id: string }[] | undefined) => {
  return (list ?? []).map(({ id }) => {
    return id;
  });
};

const clamp = (value: number | undefined, min: number, max: number) => {
  return value === undefined ? undefined : Math.min(max, Math.max(min, value));
};

// '#rrggbb' as is, '#rgb' expanded; anything else is not a colour.
const hexColour = (value: string): string | undefined => {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  return short
    ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
    : undefined;
};

/**
 * The model with every id valid in the scene format and unique in its
 * collection, colours as #rrggbb (or dropped, with the references to them),
 * icons the scene format refuses dropped (and the references to them), and
 * numbers clamped to the scene format's ranges. Every reference follows.
 */
export const normaliseLegacyModel = (
  model: Model
): { model: Model; viewId: (id: string) => string } => {
  const itemId = idMap(ids(model.items));
  const viewId = idMap(ids(model.views));

  const icons = model.icons.filter((icon) => {
    return isAllowedIconUrl(icon.url);
  });
  const iconId = idMap(ids(icons));
  const iconIds = new Set(ids(icons));

  const colors = model.colors.flatMap((c) => {
    const value = hexColour(c.value);
    return value ? [{ ...c, value }] : [];
  });
  const colorId = idMap(ids(colors));
  const colorIds = new Set(ids(colors));
  const colour = (id: string | undefined) => {
    return id !== undefined && colorIds.has(id) ? colorId(id) : undefined;
  };

  // lw-052: 'redacted' is reserved, so it is never remapped; a layerId
  // naming no listed layer is dropped (the item goes to the base layer).
  const layers = (model.layers ?? []).filter((layer) => {
    return layer.id !== REDACTED_LAYER_ID;
  });
  const layerMap = idMap(ids(layers));
  const layerIds = new Set(ids(layers));
  const layer = (id: string | undefined) => {
    if (id === REDACTED_LAYER_ID) return id;
    return id !== undefined && layerIds.has(id) ? layerMap(id) : undefined;
  };

  const next: Model = {
    ...model,
    ...(model.layers
      ? {
          layers: layers.map((l) => {
            return { ...l, id: layerMap(l.id) };
          })
        }
      : {}),
    items: model.items.map((item) => {
      const { icon, ...rest } = item;
      return {
        ...rest,
        id: itemId(item.id),
        ...(icon !== undefined && iconIds.has(icon)
          ? { icon: iconId(icon) }
          : {})
      };
    }),
    // lw-053: a connection's ends follow the items.
    ...(model.connections
      ? {
          connections: (() => {
            const connectionId = idMap(ids(model.connections));
            return model.connections.map((c) => {
              return {
                ...c,
                id: connectionId(c.id),
                from: itemId(c.from),
                to: itemId(c.to)
              };
            });
          })()
        }
      : {}),
    icons: icons.map((icon) => {
      return { ...icon, id: iconId(icon.id) };
    }),
    colors: colors.map((c) => {
      return { ...c, id: colorId(c.id) };
    }),
    views: model.views.map((view) => {
      const groupId = idMap(ids(view.groups));
      const group = (id: string | undefined) => {
        return id === undefined ? undefined : groupId(id);
      };
      const connectorId = idMap(ids(view.connectors));
      const anchorId = idMap(
        (view.connectors ?? []).flatMap((c) => {
          return ids(c.anchors);
        })
      );
      const rectangleId = idMap(ids(view.rectangles));
      const textBoxId = idMap(ids(view.textBoxes));
      const strip = <T extends object>(value: T): T => {
        return Object.fromEntries(
          Object.entries(value).filter(([, v]) => {
            return v !== undefined;
          })
        ) as T;
      };
      return strip({
        ...view,
        id: viewId(view.id),
        items: view.items.map((item) => {
          return strip({
            ...item,
            id: itemId(item.id),
            labelHeight: clamp(item.labelHeight, -1000, 1000),
            parentGroupId: group(item.parentGroupId),
            layerId: layer(item.layerId)
          });
        }),
        connectors: view.connectors?.map((c) => {
          return strip({
            ...c,
            id: connectorId(c.id),
            color: colour(c.color),
            width: clamp(c.width, 0, 1000),
            layerId: layer(c.layerId),
            anchors: c.anchors.map((a) => {
              const { ref } = a;
              return {
                id: anchorId(a.id),
                ref:
                  ref.item !== undefined
                    ? { item: itemId(ref.item) }
                    : ref.anchor !== undefined
                      ? { anchor: anchorId(ref.anchor) }
                      : { tile: ref.tile }
              };
            })
          });
        }),
        rectangles: view.rectangles?.map((r) => {
          return strip({
            ...r,
            id: rectangleId(r.id),
            color: colour(r.color),
            parentGroupId: group(r.parentGroupId),
            layerId: layer(r.layerId)
          });
        }),
        textBoxes: view.textBoxes?.map((t) => {
          return strip({
            ...t,
            id: textBoxId(t.id),
            fontSize: clamp(t.fontSize, 0, 1000),
            parentGroupId: group(t.parentGroupId),
            layerId: layer(t.layerId)
          });
        }),
        groups: view.groups?.map((g) => {
          return strip({
            ...g,
            id: groupId(g.id),
            parentGroupId: group(g.parentGroupId)
          });
        })
      });
    })
  };
  return { model: next, viewId };
};

export interface LegacyModelOptions {
  /**
   * lw-091: give every connector whose two ends are items a logical
   * connection between them (scene-format.md, "Reticulyne model"). Off by
   * default: two connectors between the same pair are not necessarily
   * two cables, so it is only done when asked.
   */
  connections?: boolean;
}

const pairKey = (a: string, b: string) => {
  return a < b ? `${a}\n${b}` : `${b}\n${a}`;
};

/**
 * The model with a connection for each pair of items a connector joins,
 * and each such connector drawing it. One connection per pair, whatever
 * views and however many connectors draw it: a second cable between the
 * same two items is added by hand. A pair the model already connects
 * reuses that connection, and a connector that already draws one is left
 * as it is.
 */
export const connectionsFromConnectors = (model: Model): Model => {
  const connections = [...(model.connections ?? [])];
  const byPair = new Map<string, string>();
  connections.forEach((c) => {
    const key = pairKey(c.from, c.to);
    if (!byPair.has(key)) byPair.set(key, c.id);
  });
  const itemIds = new Set(ids(model.items));
  let added = false;
  const views = model.views.map((view) => {
    if (!view.connectors) return view;
    return {
      ...view,
      connectors: view.connectors.map((c) => {
        if (c.connection !== undefined) return c;
        const from = c.anchors[0]?.ref.item;
        const to = c.anchors[c.anchors.length - 1]?.ref.item;
        if (from === undefined || to === undefined || from === to) return c;
        if (!itemIds.has(from) || !itemIds.has(to)) return c;
        const key = pairKey(from, to);
        let connection = byPair.get(key);
        if (connection === undefined) {
          connection = generateId();
          byPair.set(key, connection);
          connections.push({ id: connection, from, to });
          added = true;
        }
        return { ...c, connection };
      })
    };
  });
  return added ? { ...model, views, connections } : { ...model, views };
};

/**
 * A Reticulyne model as a scene: one `iso` view per Reticulyne view, the
 * model items as objects (including any not placed in a view), and the
 * icons and colours unchanged. The model's `version` is dropped. With
 * `connections`, connectors between items also become connections.
 */
export const legacyModelToScene = (
  model: Model,
  id: string = generateId(),
  options: LegacyModelOptions = {}
): Scene => {
  const { model: valid } = normaliseLegacyModel(model);
  const normalised = options.connections
    ? connectionsFromConnectors(valid)
    : valid;
  return sceneFromModel(normalised, {
    opened: { format: SCENE_FORMAT, version: SCENE_VERSION, id, objects: [] }
  });
};
