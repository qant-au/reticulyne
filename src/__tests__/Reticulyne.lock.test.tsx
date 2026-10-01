/**
 * @jest-environment jsdom
 */
import { useEffect, useRef } from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import type { InitialData, ItemReference, View } from 'src/types';

// Ctrl/Cmd+Shift+L locks the selection, as in Excalidraw.

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

const diagram: InitialData = {
  title: 'Locks',
  icons: [],
  colors: [],
  items: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' }
  ],
  views: [
    {
      id: 'v',
      name: 'V',
      items: [
        { id: 'a', tile: { x: 0, y: 0 } },
        { id: 'b', tile: { x: 3, y: 0 } }
      ]
    }
  ]
};

type Probe = { view: () => View; selection: () => ItemReference[] };

const ProbeInside = ({ onReady }: { onReady: (p: Probe) => void }) => {
  const view = useRef<View | null>(null);
  const selection = useRef<ItemReference[]>([]);
  const viewsNow = useModelStore((state) => {
    return state.views;
  });
  const selectionNow = useUiStateStore((state) => {
    return state.selection;
  });
  useEffect(() => {
    view.current = viewsNow[0];
    selection.current = selectionNow;
  }, [viewsNow, selectionNow]);
  useEffect(() => {
    onReady({
      view: () => {
        return view.current!;
      },
      selection: () => {
        return selection.current;
      }
    });
  }, [onReady]);
  return null;
};

const mount = (
  props: Partial<Parameters<typeof Reticulyne>[0]> = {}
): Probe => {
  let probe: Probe | null = null;
  act(() => {
    render(
      <Reticulyne initialData={diagram} {...props}>
        <ProbeInside
          onReady={(p) => {
            probe = p;
          }}
        />
      </Reticulyne>
    );
  });
  if (!probe) throw new Error('probe did not mount');
  return probe;
};

const key = (init: KeyboardEventInit) => {
  act(() => {
    fireEvent.keyDown(window, init);
  });
};

const selectAll = () => {
  key({ key: 'a', code: 'KeyA', ctrlKey: true });
};
const lock = () => {
  key({ key: 'L', code: 'KeyL', ctrlKey: true, shiftKey: true });
};

describe('lock (Ctrl/Cmd+Shift+L)', () => {
  test('locks the selection and deselects it; select all then skips it', () => {
    const probe = mount();
    selectAll();
    expect(probe.selection()).toHaveLength(2);

    lock();
    expect(probe.selection()).toEqual([]);
    const v = probe.view();
    expect(v.items[0].locked).toBe(true);
    expect(v.items[1].locked).toBe(true);

    selectAll();
    expect(probe.selection()).toEqual([]);
  });

  test('one undo step takes the lock off again', () => {
    const probe = mount();
    selectAll();
    lock();
    key({ key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(probe.view().items[0]).not.toHaveProperty('locked');
  });

  test('does nothing read-only', () => {
    const probe = mount({ editorMode: 'EXPLORABLE_READONLY' });
    lock();
    expect(probe.view().items[0]).not.toHaveProperty('locked');
  });
});
