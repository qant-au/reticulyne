/**
 * @jest-environment jsdom
 */
import { useEffect, useRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { ModelProvider, useModelStore } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider } from 'src/stores/uiStateStore';
import { useScene } from '../useScene';
import { useInitialDataManager } from '../useInitialDataManager';
import { model as fixtureModel } from 'src/fixtures/model';
import type {
  InitialData,
  ModelItem,
  ViewItem,
  Connector,
  Rectangle,
  TextBox,
  Model
} from 'src/types';

// jsdom ships HTMLCanvasElement but no rendering context — getContext('2d')
// returns null. getTextBoxDimensions / getTextWidth throws on null, so any
// reducer path that creates or syncs a text-box needs a minimal stub.
// Numbers don't have to be physically accurate; the reducers just need a
// non-null context that supports `.font` and `.measureText`.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return {
      font: '',
      measureText: (text: string) => {
        return { width: text.length * 6 };
      }
    } as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement['getContext'];
});

type Slot = {
  scene: ReturnType<typeof useScene>;
  getModel: () => Model;
};

// SceneProbe runs *after* the initial-data manager has populated the
// stores. It calls the hook under test on every render and hands the
// captured surface back to the test via the onCapture callback (called
// during render). Calling a callback prop is fine for the React-
// Compiler-flavoured react-hooks lint rules; reassigning a parameter
// is not, which is why we go through a callback instead of a slot ref.
const SceneProbe = ({ onCapture }: { onCapture: (s: Slot) => void }) => {
  const scene = useScene();
  const modelActions = useModelStore((state) => {
    return state.actions;
  });

  onCapture({
    scene,
    getModel: () => {
      return modelActions.get();
    }
  });

  return null;
};

// Loader runs useInitialDataManager and triggers load() once on mount.
// Until the initial-data manager flips isReady=true (i.e. validation
// passes and the model store / scene store have been populated), we
// don't render SceneProbe at all — useScene's view-id lookup would
// otherwise throw against an empty store. This mirrors the same
// readiness gate that the real <Isoflow> component uses around its
// Renderer subtree.
const Loader = ({
  initialData,
  onCapture
}: {
  initialData: InitialData;
  onCapture: (s: Slot) => void;
}) => {
  const { load, isReady } = useInitialDataManager();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load(initialData);
    }
  }, [initialData, load]);

  if (!isReady) return null;
  return <SceneProbe onCapture={onCapture} />;
};

const Harness = ({
  initialData,
  onCapture
}: {
  initialData: InitialData;
  onCapture: (s: Slot) => void;
}) => {
  return (
    <ModelProvider>
      <SceneProvider>
        <UiStateProvider>
          <Loader initialData={initialData} onCapture={onCapture} />
        </UiStateProvider>
      </SceneProvider>
    </ModelProvider>
  );
};

const setup = (): { current: Slot } => {
  const ref: { current: Slot | null } = { current: null };
  act(() => {
    render(
      <Harness
        initialData={fixtureModel as InitialData}
        onCapture={(s) => {
          ref.current = s;
        }}
      />
    );
  });
  if (ref.current === null) {
    throw new Error('Harness did not capture the hook API.');
  }
  return ref as { current: Slot };
};

describe('useScene', () => {
  let alertSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {
      return undefined;
    });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    logSpy.mockRestore();
    cleanup();
  });

  describe('read surface', () => {
    test('exposes view-scoped items, rectangles, connectors, textBoxes', () => {
      const slot = setup();
      const view = fixtureModel.views[0];

      expect(
        slot.current.scene.items.map((i) => {
          return i.id;
        })
      ).toEqual(
        (view.items ?? []).map((i) => {
          return i.id;
        })
      );
      expect(
        slot.current.scene.rectangles.map((r) => {
          return r.id;
        })
      ).toEqual(
        (view.rectangles ?? []).map((r) => {
          return r.id;
        })
      );
      expect(
        slot.current.scene.connectors.map((c) => {
          return c.id;
        })
      ).toEqual(
        (view.connectors ?? []).map((c) => {
          return c.id;
        })
      );
      expect(slot.current.scene.textBoxes).toEqual([]);
    });

    test('colors mirror the model store', () => {
      const slot = setup();

      expect(slot.current.scene.colors).toEqual(fixtureModel.colors);
    });

    test('currentView is the activated view', () => {
      const slot = setup();
      expect(slot.current.scene.currentView.id).toBe(fixtureModel.views[0].id);
    });
  });

  describe('model items', () => {
    test('createModelItem appends to model.items', () => {
      const slot = setup();
      const before = slot.current.getModel().items.length;
      const next: ModelItem = { id: 'new-node', name: 'New', icon: 'icon1' };

      act(() => {
        slot.current.scene.createModelItem(next);
      });

      const after = slot.current.getModel().items;
      expect(after).toHaveLength(before + 1);
      expect(after[after.length - 1]).toEqual(next);
    });

    test('updateModelItem mutates the named item in place', () => {
      const slot = setup();

      act(() => {
        slot.current.scene.updateModelItem('node1', { name: 'renamed' });
      });

      const updated = slot.current.getModel().items.find((i) => {
        return i.id === 'node1';
      });
      expect(updated?.name).toBe('renamed');
    });

    test('deleteModelItem removes the model item (locks in current reducer behaviour)', () => {
      const slot = setup();
      // Sanity: node1 is present in both the model and the active view.
      expect(
        slot.current.getModel().items.some((i) => {
          return i?.id === 'node1';
        })
      ).toBe(true);
      expect(
        slot.current.scene.items.some((i) => {
          return i.id === 'node1';
        })
      ).toBe(true);

      act(() => {
        slot.current.scene.deleteModelItem('node1');
      });

      // Note: the current reducer uses `delete arr[i]` which leaves a
      // sparse-array hole rather than splicing. We use optional
      // chaining so the assertion is robust to either implementation —
      // what we actually care about is that node1 is gone, not the
      // array shape. If the reducer is later fixed to splice, this
      // test continues to pass.
      expect(
        slot.current.getModel().items.some((i) => {
          return i?.id === 'node1';
        })
      ).toBe(false);
    });
  });

  describe('view items', () => {
    test('createViewItem adds a placement to the active view', () => {
      const slot = setup();
      const before = slot.current.scene.items.length;
      const next: ViewItem = {
        id: 'node1', // a model item that exists in the fixture
        tile: { x: 5, y: 5 }
      };

      // First nuke node1's existing view placement so the fixture
      // doesn't already satisfy the schema's no-duplicate rule.
      act(() => {
        slot.current.scene.deleteViewItem('node1');
      });
      const afterDelete = slot.current.scene.items.length;
      expect(afterDelete).toBe(before - 1);

      act(() => {
        slot.current.scene.createViewItem(next);
      });

      const added = slot.current.scene.items.find((i) => {
        return i.id === 'node1';
      });
      expect(added).toBeDefined();
      expect(added?.tile).toEqual({ x: 5, y: 5 });
    });

    test('updateViewItem moves an existing placement', () => {
      const slot = setup();

      act(() => {
        slot.current.scene.updateViewItem('node1', { tile: { x: 9, y: 9 } });
      });

      const moved = slot.current.scene.items.find((i) => {
        return i.id === 'node1';
      });
      expect(moved?.tile).toEqual({ x: 9, y: 9 });
    });

    test('deleteViewItem removes the view placement but keeps the model item', () => {
      const slot = setup();

      act(() => {
        slot.current.scene.deleteViewItem('node1');
      });

      expect(
        slot.current.scene.items.some((i) => {
          return i.id === 'node1';
        })
      ).toBe(false);
      expect(
        slot.current.getModel().items.some((i) => {
          return i.id === 'node1';
        })
      ).toBe(true);
    });
  });

  describe('connectors', () => {
    test('createConnector adds an entry to the active view', () => {
      const slot = setup();
      const before = slot.current.scene.connectors.length;
      const next: Connector = {
        id: 'new-connector',
        color: fixtureModel.colors[0].id,
        anchors: [
          { id: 'a1', ref: { item: 'node1' } },
          { id: 'a2', ref: { item: 'node2' } }
        ]
      };

      act(() => {
        slot.current.scene.createConnector(next);
      });

      expect(slot.current.scene.connectors).toHaveLength(before + 1);
      expect(
        slot.current.scene.connectors.find((c) => {
          return c.id === 'new-connector';
        })
      ).toBeDefined();
    });

    test('updateConnector applies partial updates', () => {
      const slot = setup();

      act(() => {
        slot.current.scene.updateConnector('connector1', { width: 25 });
      });

      const updated = slot.current.scene.connectors.find((c) => {
        return c.id === 'connector1';
      });
      expect(updated?.width).toBe(25);
    });

    test('deleteConnector removes the entry', () => {
      const slot = setup();

      act(() => {
        slot.current.scene.deleteConnector('connector1');
      });

      expect(
        slot.current.scene.connectors.some((c) => {
          return c.id === 'connector1';
        })
      ).toBe(false);
    });
  });

  describe('rectangles', () => {
    test('create / update / delete round-trip', () => {
      const slot = setup();
      const next: Rectangle = {
        id: 'new-rect',
        color: fixtureModel.colors[0].id,
        from: { x: 0, y: 0 },
        to: { x: 3, y: 3 }
      };

      act(() => {
        slot.current.scene.createRectangle(next);
      });
      expect(
        slot.current.scene.rectangles.find((r) => {
          return r.id === 'new-rect';
        })
      ).toBeDefined();

      act(() => {
        slot.current.scene.updateRectangle('new-rect', { to: { x: 7, y: 7 } });
      });
      const moved = slot.current.scene.rectangles.find((r) => {
        return r.id === 'new-rect';
      });
      expect(moved?.to).toEqual({ x: 7, y: 7 });

      act(() => {
        slot.current.scene.deleteRectangle('new-rect');
      });
      expect(
        slot.current.scene.rectangles.some((r) => {
          return r.id === 'new-rect';
        })
      ).toBe(false);
    });
  });

  describe('text boxes', () => {
    test('create / update / delete round-trip', () => {
      const slot = setup();
      const next: TextBox = {
        id: 'new-tb',
        tile: { x: 1, y: 1 },
        content: 'hello'
      };

      act(() => {
        slot.current.scene.createTextBox(next);
      });
      expect(
        slot.current.scene.textBoxes.find((t) => {
          return t.id === 'new-tb';
        })
      ).toBeDefined();

      act(() => {
        slot.current.scene.updateTextBox('new-tb', { content: 'world' });
      });
      expect(
        slot.current.scene.textBoxes.find((t) => {
          return t.id === 'new-tb';
        })?.content
      ).toBe('world');

      act(() => {
        slot.current.scene.deleteTextBox('new-tb');
      });
      expect(
        slot.current.scene.textBoxes.some((t) => {
          return t.id === 'new-tb';
        })
      ).toBe(false);
    });
  });

  describe('duplicateItem', () => {
    test('duplicating an ITEM creates a new model item + view item with offset and "(copy)" suffix', () => {
      const slot = setup();
      const originalCount = slot.current.getModel().items.length;
      const original = slot.current.scene.items.find((i) => {
        return i.id === 'node1';
      })!;

      act(() => {
        slot.current.scene.duplicateItem({ type: 'ITEM', id: 'node1' });
      });

      // A new model item was appended (and so was a new view item).
      const newModel = slot.current.getModel();
      expect(newModel.items.length).toBe(originalCount + 1);
      const newModelItem = newModel.items[newModel.items.length - 1];
      expect(newModelItem.id).not.toBe('node1');
      expect(newModelItem.name).toBe('Node1 (copy)');

      const newViewItem = slot.current.scene.items.find((i) => {
        return i.id === newModelItem.id;
      });
      expect(newViewItem).toBeDefined();
      expect(newViewItem!.tile).toEqual({
        x: original.tile.x + 1,
        y: original.tile.y + 1
      });
    });

    test('duplicating a RECTANGLE offsets both corners by (1,1)', () => {
      const slot = setup();
      const beforeIds = new Set(
        slot.current.scene.rectangles.map((r) => {
          return r.id;
        })
      );
      const original = slot.current.scene.rectangles.find((r) => {
        return r.id === 'rectangle1';
      })!;

      act(() => {
        slot.current.scene.duplicateItem({
          type: 'RECTANGLE',
          id: 'rectangle1'
        });
      });

      const newRect = slot.current.scene.rectangles.find((r) => {
        return !beforeIds.has(r.id);
      });
      expect(newRect).toBeDefined();
      expect(newRect!.from).toEqual({
        x: original.from.x + 1,
        y: original.from.y + 1
      });
      expect(newRect!.to).toEqual({
        x: original.to.x + 1,
        y: original.to.y + 1
      });
    });

    test('duplicating a CONNECTOR is a deliberate no-op', () => {
      const slot = setup();
      const before = slot.current.scene.connectors.length;

      act(() => {
        slot.current.scene.duplicateItem({
          type: 'CONNECTOR',
          id: 'connector1'
        });
      });

      expect(slot.current.scene.connectors).toHaveLength(before);
    });
  });
});
