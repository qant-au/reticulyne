/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useHistoryStore } from 'src/stores/historyStore';
import { model as fixtureModel } from 'src/fixtures/model';
import { getTilePosition } from 'src/utils';
import { MAX_ZOOM } from 'src/config';
import { PATCH_FADE_ATTR, PATCH_FADE_MS } from 'src/hooks/usePatchApplier';
import type { InitialData, UiStateActions } from 'src/types';
import { validateScene, type Scene } from 'src/vendor/accurona-core';

// applyPatch and the typed imperative API (and its events), driven through a mounted <Reticulyne> as a host would.

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => {
            return false;
          }
        };
      }
    });
  }
});

afterEach(() => {
  cleanup();
});

type Api = ReturnType<typeof useReticulyne> & {
  ui: UiStateActions;
  flushHistory: () => void;
  canUndo: () => boolean;
};

const Probe = ({ onReady }: { onReady: (api: Api) => void }) => {
  const api = useReticulyne();
  const ui = useUiStateStore((state) => {
    return state.actions;
  });
  const history = useHistoryStore((state) => {
    return state.actions;
  });
  useEffect(() => {
    onReady({
      ...api,
      ui,
      flushHistory: history.flushPending,
      canUndo: history.canUndo
    });
  }, [api, ui, history, onReady]);
  return null;
};

const mount = (
  props: Partial<Parameters<typeof Reticulyne>[0]> = {}
): (() => Api) => {
  let captured: Api | null = null;
  act(() => {
    render(
      <Reticulyne initialData={fixtureModel as InitialData} {...props}>
        <Probe
          onReady={(api) => {
            captured = api;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    if (!captured) throw new Error('probe did not mount');
    return captured;
  };
};

describe('applyPatch (1.5)', () => {
  test('updates the model and leaves selection, zoom and pan alone', () => {
    const api = mount();
    act(() => {
      api().select('node2');
      api().setZoom(0.5);
    });
    const viewport = api().getViewport();

    act(() => {
      api().applyPatch({
        items: { node1: { name: 'Primary DB' } },
        connectors: { connector1: { width: 12 } },
        rectangles: { rectangle1: { colorValue: '#ff0000' } }
      });
    });

    expect(api().getNode('node1')?.name).toBe('Primary DB');
    expect(api().Connector.get('connector1')?.width).toBe(12);
    const rect = api()
      .getModel()
      .views[0].rectangles?.find((r) => {
        return r.id === 'rectangle1';
      });
    expect(rect?.colorValue).toBe('#ff0000');
    expect(api().getSelection()).toEqual([{ type: 'ITEM', id: 'node2' }]);
    expect(api().getViewport()).toEqual(viewport);
  });

  test('skips ids that do not exist, without error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
    const api = mount();
    const before = api().getModel();
    act(() => {
      api().applyPatch({
        items: { gone: { name: 'x' } },
        connectors: { gone: { width: 3 } }
      });
    });
    expect(api().getModel()).toEqual(before);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('moves a node with updateNode', () => {
    const api = mount();
    act(() => {
      api().updateNode('node1', { tile: { x: 3, y: 1 } });
    });
    expect(api().getNode('node1')?.tile).toEqual({ x: 3, y: 1 });
  });

  test('is not undoable unless pushToUndo is set', () => {
    const api = mount();
    act(() => {
      api().applyPatch({ items: { node1: { name: 'Live' } } });
      api().flushHistory();
    });
    expect(api().canUndo()).toBe(false);

    act(() => {
      api().applyPatch(
        { items: { node1: { name: 'Deliberate' } } },
        { pushToUndo: true }
      );
      api().flushHistory();
    });
    expect(api().canUndo()).toBe(true);
  });

  test('waits while items are being dragged, then lands', () => {
    const api = mount();
    act(() => {
      api().ui.setMode({
        type: 'DRAG_ITEMS',
        showCursor: true,
        items: [{ type: 'ITEM', id: 'node2' }],
        isInitialMovement: false
      });
    });
    act(() => {
      api().applyPatch({ items: { node1: { name: 'Queued' } } });
    });
    expect(api().getNode('node1')?.name).toBe('Node1');

    act(() => {
      api().ui.setMode({
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: null
      });
    });
    expect(api().getNode('node1')?.name).toBe('Queued');
  });

  test('is refused in NON_INTERACTIVE', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const api = mount({ editorMode: 'NON_INTERACTIVE' });
    act(() => {
      api().applyPatch({ items: { node1: { name: 'x' } } });
    });
    expect(api().getNode('node1')?.name).toBe('Node1');
    warnSpy.mockRestore();
  });

  test('opens a colour-fade window on the renderer, then closes it', () => {
    const api = mount();
    const el = api().ui.get().rendererEl!;
    jest.useFakeTimers();
    try {
      act(() => {
        api().applyPatch({ connectors: { gone: { color: 'x' } } });
      });
      // nothing changed, so nothing to fade
      expect(el.hasAttribute(PATCH_FADE_ATTR)).toBe(false);

      act(() => {
        api().applyPatch({
          rectangles: { rectangle1: { colorValue: '#ff0000' } }
        });
      });
      expect(el.hasAttribute(PATCH_FADE_ATTR)).toBe(true);
      act(() => {
        jest.advanceTimersByTime(PATCH_FADE_MS);
        // a second patch mid-fade keeps the window open
        api().applyPatch({
          rectangles: { rectangle1: { colorValue: '#00ff00' } }
        });
        jest.advanceTimersByTime(PATCH_FADE_MS);
      });
      expect(el.hasAttribute(PATCH_FADE_ATTR)).toBe(true);
      act(() => {
        jest.advanceTimersByTime(PATCH_FADE_MS);
      });
      expect(el.hasAttribute(PATCH_FADE_ATTR)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('works read-only, where live dashboards run', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().setConnectorRate('connector1', 0.25);
    });
    expect(api().Connector.get('connector1')?.animationRate).toBe(0.25);
  });
});

describe('reads, view and selection (1.6)', () => {
  test('getNode returns a copy, not the store object', () => {
    const api = mount();
    const node = api().getNode('node1')!;
    expect(node).toEqual({
      id: 'node1',
      name: 'Node1',
      description: 'Node1Description',
      icon: 'icon1',
      tile: { x: 0, y: 0 }
    });
    node.tile!.x = 99;
    expect(api().getNode('node1')?.tile).toEqual({ x: 0, y: 0 });
    expect(api().getNode('missing')).toBeUndefined();
  });

  test('focusNode centres the node and clamps the zoom', () => {
    const api = mount();
    act(() => {
      api().focusNode('node2', { zoom: 5 });
    });
    const p = getTilePosition({ tile: { x: 0, y: 4 } });
    const vp = api().getViewport();
    expect(vp.zoom).toBe(MAX_ZOOM);
    expect(vp.scroll.x).toBeCloseTo(-p.x * MAX_ZOOM);
    expect(vp.scroll.y).toBeCloseTo(-p.y * MAX_ZOOM);
  });

  test('setZoom clamps to the editor range', () => {
    const api = mount();
    act(() => {
      api().setZoom(40);
    });
    expect(api().getViewport().zoom).toBe(MAX_ZOOM);
  });

  test('select resolves ids by kind and skips unknown ones', () => {
    const onSelectionChange = jest.fn();
    const api = mount({ onSelectionChange });
    act(() => {
      api().select(['node1', 'connector1', 'nope']);
    });
    const expected = [
      { type: 'ITEM', id: 'node1' },
      { type: 'CONNECTOR', id: 'connector1' }
    ];
    expect(api().getSelection()).toEqual(expected);
    expect(onSelectionChange).toHaveBeenLastCalledWith(expected);

    act(() => {
      api().clearSelection();
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  test('select is EDITABLE only', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().select('node1');
    });
    expect(api().getSelection()).toEqual([]);
    warnSpy.mockRestore();
  });

  test('onViewportChange fires on zoom, not on mount', () => {
    const onViewportChange = jest.fn();
    const api = mount({ onViewportChange });
    onViewportChange.mockClear();
    act(() => {
      api().setZoom(0.5);
    });
    expect(onViewportChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: 0.5, viewId: 'view1' })
    );
  });

  test('the Model and uiState escape hatches are gone', () => {
    const api = mount();
    expect('Model' in api()).toBe(false);
    expect('uiState' in api()).toBe(false);
  });
});

describe('getScene and loadModel with a scene', () => {
  test('getScene returns the diagram as a valid scene, edits included', () => {
    const api = mount();
    act(() => {
      api().applyPatch({ items: { node1: { name: 'Primary DB' } } });
    });
    const scene = api().getScene();
    expect(validateScene(scene).ok).toBe(true);
    expect(
      scene.objects.find((o) => {
        return o.id === 'node1';
      })?.name
    ).toBe('Primary DB');
  });

  test('loadModel takes a scene, with view hints as options', () => {
    const api = mount();
    const scene: Scene = {
      format: 'accurona-scene',
      version: 1,
      id: 'loaded',
      title: 'Loaded',
      objects: [{ id: 'x', name: 'X' }],
      views: [
        { id: 'a', kind: 'iso', name: 'A' },
        {
          id: 'b',
          kind: 'schematic',
          name: 'B',
          placements: [{ object: 'x', tile: { x: 0, y: 0 } }]
        }
      ]
    };
    act(() => {
      api().loadModel(scene, { view: 'b' });
    });
    expect(api().getTitle()).toBe('Loaded');
    expect(api().getViewport().viewId).toBe('b');
    expect(api().getScene()).toEqual(scene);
  });
});
