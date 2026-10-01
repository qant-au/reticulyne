// Which items a layer setting leaves on the canvas, and in an
// export. Pure, so the editor, the exports and the tests share one rule.
//
// An item is left out when its layer is hidden, or (in an export that has
// not opted in) when it is on the reserved Redacted layer. A connector
// that ends on a node left out, or on an anchor of a connector left out,
// goes too: a line into nothing says more than it should.

import { REDACTED_LAYER_ID } from 'src/schemas/layer';
import type { Layer, Model, View } from 'src/types/model';

export { REDACTED_LAYER_ID };

/** The ids of the layers switched off. */
export const hiddenLayerIds = (layers: Layer[] | undefined): Set<string> => {
  return new Set(
    (layers ?? [])
      .filter((layer) => {
        return layer.visible === false;
      })
      .map((layer) => {
        return layer.id;
      })
  );
};

/**
 * The view with every item on one of `leftOut` layers removed, and the
 * connectors that ended on them. Returns the same view object when nothing
 * is removed, so a diagram with no hidden layers costs nothing.
 */
export const filterViewByLayers = (
  view: View,
  leftOut: ReadonlySet<string>
): View => {
  if (leftOut.size === 0) return view;
  const shown = <T extends { layerId?: string }>(entry: T) => {
    return entry.layerId === undefined || !leftOut.has(entry.layerId);
  };

  const items = view.items.filter(shown);
  const itemIds = new Set(
    items.map((item) => {
      return item.id;
    })
  );
  let connectors = (view.connectors ?? []).filter(shown);
  for (;;) {
    const anchorIds = new Set(
      connectors.flatMap((c) => {
        return c.anchors.map((a) => {
          return a.id;
        });
      })
    );
    const next = connectors.filter((c) => {
      return c.anchors.every(({ ref }) => {
        if (ref.item !== undefined) return itemIds.has(ref.item);
        if (ref.anchor !== undefined) return anchorIds.has(ref.anchor);
        return true;
      });
    });
    if (next.length === connectors.length) break;
    connectors = next;
  }
  const rectangles = view.rectangles?.filter(shown);
  const textBoxes = view.textBoxes?.filter(shown);

  const unchanged =
    items.length === view.items.length &&
    connectors.length === (view.connectors ?? []).length &&
    rectangles?.length === view.rectangles?.length &&
    textBoxes?.length === view.textBoxes?.length;
  if (unchanged) return view;

  return {
    ...view,
    items,
    ...(view.connectors ? { connectors } : {}),
    ...(rectangles ? { rectangles } : {}),
    ...(textBoxes ? { textBoxes } : {})
  };
};

/** True when anything in any view is on the Redacted layer. */
export const hasRedactedContent = (model: Pick<Model, 'views'>): boolean => {
  const on = (entry: { layerId?: string }) => {
    return entry.layerId === REDACTED_LAYER_ID;
  };
  return model.views.some((view) => {
    return (
      view.items.some(on) ||
      (view.connectors ?? []).some(on) ||
      (view.rectangles ?? []).some(on) ||
      (view.textBoxes ?? []).some(on)
    );
  });
};

/**
 * The model an image, PDF or SVG export draws: hidden layers left out, and
 * the Redacted layer too unless `includeRedacted`. Model items no longer
 * placed in any view go with them, so their names do not travel either.
 */
export const modelForExport = <T extends Model>(
  model: T,
  { includeRedacted }: { includeRedacted: boolean }
): T => {
  const leftOut = hiddenLayerIds(model.layers);
  if (!includeRedacted) leftOut.add(REDACTED_LAYER_ID);
  const views = model.views.map((view) => {
    return filterViewByLayers(view, leftOut);
  });
  const unchanged = views.every((view, i) => {
    return view === model.views[i];
  });
  if (unchanged) return model;
  const placed = new Set(
    views.flatMap((view) => {
      return view.items.map((item) => {
        return item.id;
      });
    })
  );
  const placedBefore = new Set(
    model.views.flatMap((view) => {
      return view.items.map((item) => {
        return item.id;
      });
    })
  );
  const items = model.items.filter((item) => {
    return !placedBefore.has(item.id) || placed.has(item.id);
  });
  // And the connections to them, so a stub does not name them.
  const kept = new Set(
    items.map((item) => {
      return item.id;
    })
  );
  return {
    ...model,
    views,
    items,
    ...(model.connections
      ? {
          connections: model.connections.filter((c) => {
            return kept.has(c.from) && kept.has(c.to);
          })
        }
      : {})
  };
};
