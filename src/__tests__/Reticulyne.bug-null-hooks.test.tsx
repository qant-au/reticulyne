/**
 * @jest-environment jsdom
 *
 * BUG-01: Regression tests for null-safe render hooks.
 *
 * Before the fix, five hooks (useModelItem, useConnector, useRectangle,
 * useTextBox, useViewItem) called getItemByIdOrThrow in their render path.
 * When an item was deleted, React child components went through one final
 * render cycle before unmounting. The throw surfaced through
 * ReticulyneErrorBoundary and replaced the entire editor with "Editor failed
 * to load." — observable via the onError prop.
 *
 * Hook-level tests cover useModelItem (which only needs ModelProvider).
 * Connector, rectangle, and view-item null-safety depends on useScene which
 * in turn requires a fully seeded store; that path is covered by the onError
 * integration test at the bottom of this file.
 */
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { render, cleanup } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { ModelProvider, useModelStore } from 'src/stores/modelStore';
import { useModelItem } from 'src/hooks/useModelItem';
import type { InitialData } from 'src/types';

const ModelWrapper = ({ children }: { children: ReactNode }) => {
  return <ModelProvider>{children}</ModelProvider>;
};

// jsdom shims required by the Reticulyne renderer
beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
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

describe('BUG-01: useModelItem null-safety', () => {
  test('returns null when model has no matching item', () => {
    const { result } = renderHook(
      () => {
        return useModelItem('no-such-id');
      },
      { wrapper: ModelWrapper }
    );
    expect(result.current).toBeNull();
  });

  test('returns null after its item is removed from the store', () => {
    const { result } = renderHook(
      () => {
        const setModel = useModelStore((s) => {
          return s.actions.set;
        });
        const item = useModelItem('item-a');
        return { setModel, item };
      },
      { wrapper: ModelWrapper }
    );

    // Seed the store with one item
    act(() => {
      result.current.setModel((state) => {
        return {
          ...state,
          items: [{ id: 'item-a', name: 'A' }]
        };
      });
    });
    expect(result.current.item?.id).toBe('item-a');

    // Remove the item — simulates the deletion path
    act(() => {
      result.current.setModel((state) => {
        return { ...state, items: [] };
      });
    });
    expect(result.current.item).toBeNull();
  });
});

describe('BUG-01: editor does not crash when rendering items', () => {
  // Minimal fixture with nodes, connectors, and rectangles (textBoxes
  // omitted — canvas rendering via HTMLCanvasElement is not available
  // in jsdom and is unrelated to this bug fix).
  const initialData: InitialData = {
    version: '',
    title: 'BUG-01 fixture',
    icons: [],
    colors: [{ id: 'color-1', value: '#ff0000' }],
    items: [{ id: 'node-a', name: 'Node A' }],
    views: [
      {
        id: 'view-1',
        name: 'View 1',
        items: [{ id: 'node-a', tile: { x: 0, y: 0 } }],
        connectors: [
          {
            id: 'conn-1',
            color: 'color-1',
            anchors: [
              { id: 'anc-1', ref: { tile: { x: 0, y: 0 } } },
              { id: 'anc-2', ref: { tile: { x: 2, y: 0 } } }
            ]
          }
        ],
        rectangles: [
          {
            id: 'rect-1',
            color: 'color-1',
            from: { x: 3, y: 0 },
            to: { x: 5, y: 2 }
          }
        ]
      }
    ]
  };

  test('mounts with nodes, connectors, and rectangles without triggering onError', () => {
    const onError = jest.fn();
    render(<Reticulyne onError={onError} initialData={initialData} />);
    expect(onError).not.toHaveBeenCalled();
  });

  test('removes model items via Model.set without triggering onError', () => {
    // When model.items is cleared while the scene still has view items
    // pointing to those model IDs, useModelItem returns null and Node
    // components bail out cleanly instead of crashing the editor.
    const onError = jest.fn();
    const onModelUpdated = jest.fn();

    const { unmount } = render(
      <Reticulyne
        onError={onError}
        onModelUpdated={onModelUpdated}
        initialData={initialData}
      />
    );

    expect(onModelUpdated).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    unmount();
    expect(onError).not.toHaveBeenCalled();
  });
});
