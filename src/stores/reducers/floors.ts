import type { Connection } from 'src/types';
import type { State } from './types';

// Floors (the model's views, lowest first) and the connections
// that join items across them. Each function returns the state unchanged
// when there is nothing to do, so no empty undo step is made.

const sameEnds = (a: Connection, from: string, to: string) => {
  return (a.from === from && a.to === to) || (a.from === to && a.to === from);
};

/** Joins two items; a second connection between the same pair is not added. */
export const addConnection = (state: State, connection: Connection): State => {
  const { from, to } = connection;
  const connections = state.model.connections ?? [];
  if (
    from === to ||
    connections.some((c) => {
      return c.id === connection.id || sameEnds(c, from, to);
    })
  ) {
    return state;
  }
  return {
    ...state,
    model: { ...state.model, connections: [...connections, connection] }
  };
};

export const deleteConnection = (state: State, id: string): State => {
  const connections = state.model.connections ?? [];
  const remaining = connections.filter((c) => {
    return c.id !== id;
  });
  if (remaining.length === connections.length) return state;
  return { ...state, model: { ...state.model, connections: remaining } };
};

export type ConnectionPortUpdate = Partial<
  Pick<Connection, 'fromPort' | 'toPort' | 'kind'>
>;

/** changes a connection's ports or kind. */
export const updateConnection = (
  state: State,
  id: string,
  updates: ConnectionPortUpdate
): State => {
  const connections = state.model.connections ?? [];
  const index = connections.findIndex((c) => {
    return c.id === id;
  });
  if (index === -1) return state;
  const next = [...connections];
  next[index] = { ...next[index], ...updates };
  return { ...state, model: { ...state.model, connections: next } };
};

/** Moves a view to `index` in the list, which is the floor order. */
export const moveView = (
  state: State,
  viewId: string,
  index: number
): State => {
  const { views } = state.model;
  const from = views.findIndex((v) => {
    return v.id === viewId;
  });
  const to = Math.max(0, Math.min(views.length - 1, index));
  if (from === -1 || from === to) return state;
  const next = [...views];
  const [view] = next.splice(from, 1);
  next.splice(to, 0, view);
  return { ...state, model: { ...state.model, views: next } };
};
