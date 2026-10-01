import type { Layer, View } from 'src/types';
import { REDACTED_LAYER_ID } from 'src/schemas/layer';
import type { State } from './types';

// Diagram layers. The list is model-wide (one layer can hold items
// on every view); an item names its layer with `layerId`, and an item
// without one is on the base layer. Each function returns the state
// unchanged when there is nothing to do, so no empty undo step is made.

type LayerRef = {
  type: 'ITEM' | 'CONNECTOR' | 'RECTANGLE' | 'TEXTBOX' | 'CONNECTOR_ANCHOR';
  id: string;
};

const withLayers = (state: State, layers: Layer[]): State => {
  return { ...state, model: { ...state.model, layers } };
};

export const addLayer = (state: State, layer: Layer): State => {
  if (layer.id === REDACTED_LAYER_ID) return state;
  return withLayers(state, [...(state.model.layers ?? []), layer]);
};

export const updateLayer = (
  state: State,
  id: string,
  updates: Partial<Pick<Layer, 'name' | 'visible'>>
): State => {
  const layers = state.model.layers ?? [];
  if (
    !layers.some((l) => {
      return l.id === id;
    })
  ) {
    return state;
  }
  return withLayers(
    state,
    layers.map((layer) => {
      if (layer.id !== id) return layer;
      const next: Layer = { ...layer, ...updates };
      // Visible is the default, so it is stored as nothing at all.
      if (next.visible !== false) delete next.visible;
      return next;
    })
  );
};

// Every item on `from` moves to `to` (undefined: the base layer).
const moveLayerOnView = (view: View, from: string, to?: string): View => {
  const move = <T extends { layerId?: string }>(list: T[] | undefined) => {
    return list?.map((entry) => {
      if (entry.layerId !== from) return entry;
      const next = { ...entry };
      if (to === undefined) delete next.layerId;
      else next.layerId = to;
      return next;
    });
  };
  return {
    ...view,
    items: move(view.items) ?? [],
    ...(view.connectors ? { connectors: move(view.connectors) } : {}),
    ...(view.rectangles ? { rectangles: move(view.rectangles) } : {}),
    ...(view.textBoxes ? { textBoxes: move(view.textBoxes) } : {})
  };
};

/** Removes the layer; what it held moves to the base layer, not away. */
export const deleteLayer = (state: State, id: string): State => {
  const layers = state.model.layers ?? [];
  const remaining = layers.filter((l) => {
    return l.id !== id;
  });
  if (remaining.length === layers.length) return state;
  return {
    ...state,
    model: {
      ...state.model,
      layers: remaining,
      views: state.model.views.map((view) => {
        return moveLayerOnView(view, id);
      })
    }
  };
};

/**
 * Puts the referenced items of one view on a layer (undefined: the base
 * layer). An anchor stands for its connector.
 */
export const setItemsLayer = (
  state: State,
  viewId: string,
  refs: LayerRef[],
  layerId: string | undefined
): State => {
  const ids = {
    ITEM: new Set<string>(),
    CONNECTOR: new Set<string>(),
    RECTANGLE: new Set<string>(),
    TEXTBOX: new Set<string>()
  };
  refs.forEach((ref) => {
    if (ref.type !== 'CONNECTOR_ANCHOR') ids[ref.type].add(ref.id);
  });
  let changed = false;
  const put = <T extends { id: string; layerId?: string }>(
    list: T[] | undefined,
    wanted: Set<string>
  ) => {
    return list?.map((entry) => {
      if (!wanted.has(entry.id) || entry.layerId === layerId) return entry;
      changed = true;
      const next = { ...entry };
      if (layerId === undefined) delete next.layerId;
      else next.layerId = layerId;
      return next;
    });
  };
  const views = state.model.views.map((view) => {
    if (view.id !== viewId) return view;
    return {
      ...view,
      items: put(view.items, ids.ITEM) ?? [],
      ...(view.connectors
        ? { connectors: put(view.connectors, ids.CONNECTOR) }
        : {}),
      ...(view.rectangles
        ? { rectangles: put(view.rectangles, ids.RECTANGLE) }
        : {}),
      ...(view.textBoxes ? { textBoxes: put(view.textBoxes, ids.TEXTBOX) } : {})
    };
  });
  if (!changed) return state;
  return { ...state, model: { ...state.model, views } };
};
