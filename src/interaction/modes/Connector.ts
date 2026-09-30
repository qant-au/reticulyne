import { produce } from 'immer';
import {
  generateId,
  getItemAtTile,
  getItemByIdOrThrow,
  hasMovedTile,
  setWindowCursor,
  getPortAtPointer,
  endRef
} from 'src/utils';
import {
  AnchorSide,
  ModeActions,
  Connector as ConnectorI,
  State,
  ItemReference
} from 'src/types';

// 2.5: what the pointer is aiming at. A node's port counts as the node
// even when the pointer sits on the neighbouring tile, so releasing on a
// target's port connects rather than cancelling. lw-061: aiming at a port
// also names its side, so the end snaps to that edge of the node.
const targetAtPointer = ({
  uiState,
  scene,
  rendererSize
}: Pick<State, 'uiState' | 'scene' | 'rendererSize'>):
  (ItemReference & { side?: AnchorSide }) | null => {
  const port = getPortAtPointer({
    mouse: uiState.mouse,
    zoom: uiState.zoom,
    scroll: uiState.scroll,
    rendererSize,
    nodes: scene.items,
    projection: scene.projection
  });
  if (port) return { type: 'ITEM', id: port.node.id, side: port.side };
  return getItemAtTile({ tile: uiState.mouse.position.tile, scene });
};

export const Connector: ModeActions = {
  entry: () => {
    setWindowCursor('crosshair');
  },
  exit: () => {
    setWindowCursor('default');
  },
  mousemove: ({ uiState, scene, rendererSize }) => {
    if (uiState.mode.type !== 'CONNECTOR' || !uiState.mode.id) return;

    const connector = getItemByIdOrThrow(
      scene.currentView.connectors ?? [],
      uiState.mode.id
    );

    const itemAtTile = targetAtPointer({ uiState, scene, rendererSize });

    // Re-resolve the end when what the pointer aims at changes, not only
    // when it crosses a tile: reaching a node's port (2.5) often happens
    // inside one tile, and waiting for a tile change would leave the end
    // on a bare tile, so the release cancelled instead of connecting.
    const end = connector.value.anchors[1];
    const aimingAtNode = itemAtTile?.type === 'ITEM';
    const unchanged = aimingAtNode
      ? end?.ref.item === itemAtTile.id && end?.ref.side === itemAtTile.side
      : !end?.ref.item && !hasMovedTile(uiState.mouse);
    if (unchanged) return;

    if (itemAtTile?.type === 'ITEM') {
      const newConnector = produce(connector.value, (draft) => {
        draft.anchors[1] = {
          id: generateId(),
          ref: endRef(itemAtTile.id, itemAtTile.side)
        };
      });

      scene.updateConnector(uiState.mode.id, newConnector);
    } else {
      const newConnector = produce(connector.value, (draft) => {
        draft.anchors[1] = {
          id: generateId(),
          ref: { tile: uiState.mouse.position.tile }
        };
      });

      scene.updateConnector(uiState.mode.id, newConnector);
    }
  },
  mousedown: ({ uiState, scene, isRendererInteraction, rendererSize }) => {
    if (uiState.mode.type !== 'CONNECTOR' || !isRendererInteraction) return;

    const newConnector: ConnectorI = {
      id: generateId(),
      // A scene may list no colours; the renderer then uses its default.
      color: scene.colors[0]?.id,
      anchors: []
    };

    const itemAtTile = targetAtPointer({ uiState, scene, rendererSize });

    if (itemAtTile && itemAtTile.type === 'ITEM') {
      newConnector.anchors = [
        { id: generateId(), ref: endRef(itemAtTile.id, itemAtTile.side) },
        { id: generateId(), ref: { item: itemAtTile.id } }
      ];
    } else {
      newConnector.anchors = [
        { id: generateId(), ref: { tile: uiState.mouse.position.tile } },
        { id: generateId(), ref: { tile: uiState.mouse.position.tile } }
      ];
    }

    scene.createConnector(newConnector);

    uiState.actions.setMode({
      type: 'CONNECTOR',
      showCursor: true,
      id: newConnector.id
    });
  },
  mouseup: ({ uiState, scene, rendererSize }) => {
    if (uiState.mode.type !== 'CONNECTOR' || !uiState.mode.id) return;

    const connector = getItemByIdOrThrow(scene.connectors, uiState.mode.id);
    const firstAnchor = connector.value.anchors[0];
    const lastIndex = connector.value.anchors.length - 1;
    const lastAnchor = connector.value.anchors[lastIndex];

    // Decide from what the pointer is on at release, not from the scene
    // snapshot this handler was given: a release straight after the last
    // move arrives before that move has re-rendered, so the snapshot's end
    // can still be a bare tile when the pointer is already on a node (2.5).
    const target = targetAtPointer({ uiState, scene, rendererSize });
    const endNode =
      target?.type === 'ITEM' ? target.id : (lastAnchor.ref.item ?? null);
    const endSide = target?.type === 'ITEM' ? target.side : lastAnchor.ref.side;
    const connects =
      Boolean(firstAnchor.ref.item) &&
      endNode !== null &&
      endNode !== firstAnchor.ref.item;

    if (!connects) {
      scene.deleteConnector(uiState.mode.id);
    } else {
      if (lastAnchor.ref.item !== endNode || lastAnchor.ref.side !== endSide) {
        const anchors = [...connector.value.anchors];
        anchors[lastIndex] = {
          id: generateId(),
          ref: endRef(endNode, endSide)
        };
        scene.updateConnector(uiState.mode.id, { anchors });
      }
      uiState.actions.setItemControls({
        type: 'CONNECTOR',
        id: uiState.mode.id
      });
    }

    uiState.actions.setMode({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  }
};
