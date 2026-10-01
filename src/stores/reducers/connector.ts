import { Connector, Model } from 'src/types';
import { produce } from 'immer';
import {
  generateId,
  getItemByIdOrThrow,
  getConnectorPath,
  getAllAnchors
} from 'src/utils';
import { pickPorts } from 'src/catalogue/topology';
import { validateConnector } from 'src/schemas/validation';
import { State, ViewReducerContext } from './types';

// A connector between two items with catalogue ports draws a
// model connection attached to a port on each (kind = the medium). The
// connection goes with the last connector that draws it, and a connector
// whose ends move to other items lets go of it and attaches afresh.

const connectorEnds = (connector: Connector) => {
  const { anchors } = connector;
  return [anchors[0]?.ref.item, anchors[anchors.length - 1]?.ref.item];
};

const drawnElsewhere = (model: Model, connection: string, except: string) => {
  return model.views.some((view) => {
    return (view.connectors ?? []).some((c) => {
      return c.id !== except && c.connection === connection;
    });
  });
};

// The model's connections less `connector`'s, unless another connector
// still draws it.
const releaseConnection = (model: Model, connector: Connector) => {
  const { connection } = connector;
  if (
    connection === undefined ||
    drawnElsewhere(model, connection, connector.id)
  ) {
    return model.connections;
  }
  const remaining = (model.connections ?? []).filter((c) => {
    return c.id !== connection;
  });
  return remaining.length ? remaining : undefined;
};

// The connections and the connector's `connection` once it is attached to
// what its ends are on now.
const attachConnection = (
  model: Model,
  connector: Connector
): Pick<Model, 'connections'> & Pick<Connector, 'connection'> => {
  const [from, to] = connectorEnds(connector);
  let { connections } = model;
  if (connector.connection !== undefined) {
    const current = connections?.find((c) => {
      return c.id === connector.connection;
    });
    const same =
      current !== undefined &&
      ((current.from === from && current.to === to) ||
        (current.from === to && current.to === from));
    if (same) return { connections, connection: connector.connection };
    connections = releaseConnection(model, connector);
  }
  const byId = (id: string | undefined) => {
    return model.items.find((item) => {
      return item.id === id;
    });
  };
  const a = byId(from);
  const b = byId(to);
  if (!a?.ports?.length || !b?.ports?.length || a === b) {
    return { connections, connection: undefined };
  }
  const ports = pickPorts(a, b, connections ?? []);
  if (!ports) return { connections, connection: undefined };
  const id = generateId();
  return {
    connections: [
      ...(connections ?? []),
      { id, from: a.id, to: b.id, ...ports }
    ],
    connection: id
  };
};

export const deleteConnector = (
  id: string,
  { viewId, state }: ViewReducerContext
): State => {
  const view = getItemByIdOrThrow(state.model.views, viewId);
  const connector = getItemByIdOrThrow(view.value.connectors ?? [], id);

  const newState = produce(state, (draft) => {
    const connections = releaseConnection(draft.model, connector.value);
    if (connections) draft.model.connections = connections;
    else delete draft.model.connections;
    draft.model.views[view.index].connectors?.splice(connector.index, 1);
    delete draft.scene.connectors[connector.value.id];
  });

  return newState;
};

export const syncConnector = (
  id: string,
  { viewId, state }: ViewReducerContext
) => {
  const newState = produce(state, (draft) => {
    const view = getItemByIdOrThrow(draft.model.views, viewId);
    const connector = getItemByIdOrThrow(view.value.connectors ?? [], id);
    const allAnchors = getAllAnchors(view.value.connectors ?? []);
    const issues = validateConnector(connector.value, {
      view: view.value,
      model: state.model,
      allAnchors
    });

    if (issues.length > 0) {
      const stateAfterDelete = deleteConnector(id, { viewId, state: draft });

      draft.scene = stateAfterDelete.scene;
      draft.model = stateAfterDelete.model;
    } else {
      const attached = attachConnection(draft.model, connector.value);
      if (attached.connections) draft.model.connections = attached.connections;
      else delete draft.model.connections;
      const target = draft.model.views[view.index].connectors![connector.index];
      if (attached.connection) target.connection = attached.connection;
      else delete target.connection;
      const path = getConnectorPath({
        anchors: connector.value.anchors,
        view: view.value
      });

      draft.scene.connectors[connector.value.id] = { path };
    }
  });

  return newState;
};

export const updateConnector = (
  { id, ...updates }: { id: string } & Partial<Connector>,
  { state, viewId }: ViewReducerContext
): State => {
  const newState = produce(state, (draft) => {
    const view = getItemByIdOrThrow(draft.model.views, viewId);
    const { connectors } = draft.model.views[view.index];

    if (!connectors) return;

    const connector = getItemByIdOrThrow(connectors, id);
    const newConnector = { ...connector.value, ...updates };
    connectors[connector.index] = newConnector;

    if (updates.anchors) {
      const stateAfterSync = syncConnector(newConnector.id, {
        viewId,
        state: draft
      });

      draft.model = stateAfterSync.model;
      draft.scene = stateAfterSync.scene;
    }
  });

  return newState;
};

export const createConnector = (
  newConnector: Connector,
  { state, viewId }: ViewReducerContext
): State => {
  const newState = produce(state, (draft) => {
    const view = getItemByIdOrThrow(draft.model.views, viewId);
    const { connectors } = draft.model.views[view.index];

    if (!connectors) {
      draft.model.views[view.index].connectors = [newConnector];
    } else {
      draft.model.views[view.index].connectors?.unshift(newConnector);
    }

    const stateAfterSync = syncConnector(newConnector.id, {
      viewId,
      state: draft
    });

    draft.model = stateAfterSync.model;
    draft.scene = stateAfterSync.scene;
  });

  return newState;
};
