/**
 * @jest-environment jsdom
 */
import { Connector } from '../Connector';
import { makeState, type SceneShape } from './_helpers';
import type { ViewItem } from 'src/types';

const sceneWithItemAt = (
  tile: { x: number; y: number },
  connectorOverrides: Partial<SceneShape['connectors'][number]>[] = []
): Partial<SceneShape> => {
  const item: ViewItem = { id: 'node1', tile };
  return {
    items: [item] as unknown as SceneShape['items'],
    currentView: {
      id: 'view1',
      name: 'view1',
      items: [item],
      connectors: connectorOverrides.map((c) => {
        return {
          id: 'conn-1',
          color: 'color1',
          anchors: [],
          ...c
        };
      }) as unknown as NonNullable<SceneShape['currentView']['connectors']>
    } as unknown as SceneShape['currentView']
  };
};

describe('Connector mode', () => {
  afterEach(() => {
    document.body.style.cursor = '';
  });

  test('entry sets cursor "crosshair"; exit restores "default"', () => {
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: null }
    });
    Connector.entry?.(state);
    expect(document.body.style.cursor).toBe('crosshair');

    Connector.exit?.(state);
    expect(document.body.style.cursor).toBe('default');
  });

  test('mousedown on an existing ITEM creates a connector anchored to that item on both ends, then updates mode.id', () => {
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: null },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 0, y: 0 } } },
      scene: sceneWithItemAt({ x: 0, y: 0 })
    });

    Connector.mousedown?.(state);

    expect(state.scene.createConnector).toHaveBeenCalledTimes(1);
    const created = (state.scene.createConnector as jest.Mock).mock.calls[0][0];
    expect(created.anchors).toHaveLength(2);
    expect(created.anchors[0].ref).toEqual({ item: 'node1' });
    expect(created.anchors[1].ref).toEqual({ item: 'node1' });

    const next = (state.uiState.actions.setMode as jest.Mock).mock.calls[0][0];
    expect(next).toEqual(
      expect.objectContaining({
        type: 'CONNECTOR',
        showCursor: true,
        id: created.id
      })
    );
  });

  test('mousedown on empty tile creates a connector anchored to that tile on both ends', () => {
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: null },
      mouse: { position: { screen: { x: 0, y: 0 }, tile: { x: 3, y: 4 } } }
    });

    Connector.mousedown?.(state);

    const created = (state.scene.createConnector as jest.Mock).mock.calls[0][0];
    expect(created.anchors[0].ref).toEqual({ tile: { x: 3, y: 4 } });
    expect(created.anchors[1].ref).toEqual({ tile: { x: 3, y: 4 } });
  });

  test('mousedown outside the renderer is ignored', () => {
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: null },
      isRendererInteraction: false
    });

    Connector.mousedown?.(state);
    expect(state.scene.createConnector).not.toHaveBeenCalled();
  });

  test('mouseup deletes a placeholder connector that did not snap to two ITEM endpoints', () => {
    // Set up a connector whose anchors are tile-only (no item refs) and
    // whose path is too short. Connector.mouseup should delete it.
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: 'conn-1' },
      scene: {
        connectors: [
          {
            id: 'conn-1',
            color: 'color1',
            anchors: [
              { id: 'a1', ref: { tile: { x: 0, y: 0 } } },
              { id: 'a2', ref: { tile: { x: 0, y: 0 } } }
            ],
            path: {
              tiles: [],
              rectangle: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }
            }
          }
        ] as unknown as SceneShape['connectors']
      }
    });

    Connector.mouseup?.(state);

    expect(state.scene.deleteConnector).toHaveBeenCalledWith('conn-1');
    expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  });

  test('mouseup keeps a connector whose endpoints both anchor to ITEMs and whose path has >=2 tiles', () => {
    const state = makeState({
      mode: { type: 'CONNECTOR', showCursor: true, id: 'conn-1' },
      scene: {
        connectors: [
          {
            id: 'conn-1',
            color: 'color1',
            anchors: [
              { id: 'a1', ref: { item: 'node1' } },
              { id: 'a2', ref: { item: 'node2' } }
            ],
            path: {
              tiles: [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ],
              rectangle: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }
            }
          }
        ] as unknown as SceneShape['connectors']
      }
    });

    Connector.mouseup?.(state);

    expect(state.scene.deleteConnector).not.toHaveBeenCalled();
    expect(state.uiState.actions.setMode).toHaveBeenCalledWith({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
  });
});
