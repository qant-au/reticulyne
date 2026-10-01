/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne from 'src/Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useHistoryStore } from 'src/stores/historyStore';
import type { InitialData, UiStateStore, Model } from 'src/types';

// Esc cancels a drag in progress and puts back what it moved, with
// no undo step left behind (UXA-03 noted that no drag had a cancel).

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      font: '',
      measureText: () => {
        return { width: 10 };
      }
    };
  }) as unknown as HTMLCanvasElement['getContext'];
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
  jest.useRealTimers();
});

const diagram: InitialData = {
  title: 'Drag',
  icons: [],
  colors: [],
  items: [{ id: 'a', name: 'Router' }],
  views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
};

let ui: UiStateStore | null = null;
let model: Model | null = null;
let canUndo: () => boolean = () => {
  return false;
};
const Probe = () => {
  const state = useUiStateStore((s) => {
    return s;
  });
  const m = useModelStore((s) => {
    return s;
  });
  const history = useHistoryStore((s) => {
    return s.actions;
  });
  useEffect(() => {
    ui = state;
    model = m;
    canUndo = history.canUndo;
  });
  return null;
};

const tileOfA = () => {
  return model!.views[0].items.find((i) => {
    return i.id === 'a';
  })!.tile;
};

const pointer = (type: string, x: number, y: number) => {
  act(() => {
    window.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
    );
  });
};

const escape = () => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
  });
};

// Press, then enter the drag as the cursor tool does once the pointer
// leaves the pressed tile, then move far enough to change tiles.
const startDrag = () => {
  act(() => {
    render(
      <Reticulyne initialData={diagram}>
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui!.actions.setSelection([{ type: 'ITEM', id: 'a' }]);
  });
  pointer('pointerdown', 400, 300);
  act(() => {
    ui!.actions.setMode({
      type: 'DRAG_ITEMS',
      showCursor: true,
      items: [{ type: 'ITEM', id: 'a' }],
      isInitialMovement: true
    });
  });
  pointer('pointermove', 700, 500);
  expect(tileOfA()).not.toEqual({ x: 0, y: 0 });
};

test('Esc during a drag puts the node back and leaves no undo step', () => {
  startDrag();
  escape();

  expect(tileOfA()).toEqual({ x: 0, y: 0 });
  expect(ui!.mode.type).toBe('CURSOR');
  expect(ui!.selection).toEqual([{ type: 'ITEM', id: 'a' }]);
  expect(canUndo()).toBe(false);

  // The button is still held: moving on neither drags nor opens a
  // marquee, and the release does not deselect.
  pointer('pointermove', 900, 700);
  expect(ui!.mode.type).toBe('CURSOR');
  expect(tileOfA()).toEqual({ x: 0, y: 0 });
  pointer('pointerup', 900, 700);
  expect(ui!.selection).toEqual([{ type: 'ITEM', id: 'a' }]);
});

test('a slow drag that committed part of itself is forgotten too', () => {
  jest.useFakeTimers();
  startDrag();
  // Longer than the history debounce: the first part is committed.
  act(() => {
    jest.advanceTimersByTime(400);
  });
  expect(canUndo()).toBe(true);
  pointer('pointermove', 800, 600);
  escape();
  act(() => {
    jest.advanceTimersByTime(400);
  });

  expect(tileOfA()).toEqual({ x: 0, y: 0 });
  expect(canUndo()).toBe(false);
});

test('Esc with no drag in progress still clears the selection', () => {
  act(() => {
    render(
      <Reticulyne initialData={diagram}>
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui!.actions.setSelection([{ type: 'ITEM', id: 'a' }]);
  });
  escape();
  expect(ui!.selection).toEqual([]);
});
