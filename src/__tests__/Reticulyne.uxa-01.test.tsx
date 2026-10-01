/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
  waitFor
} from '@testing-library/react';
import { useEffect } from 'react';
import Reticulyne from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import type { InitialData, UiStateStore } from 'src/types';

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
  // The text tool measures its content with a canvas 2D context, which
  // jsdom does not implement. Stub just enough of it for `getTextWidth`.
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      font: '',
      measureText: () => {
        return { width: 10 };
      }
    };
  }) as unknown as HTMLCanvasElement['getContext'];
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

const initialData: InitialData = {
  version: '',
  title: 'UXA-01 fixture',
  icons: [],
  colors: [{ id: 'col-1', value: '#000000' }],
  items: [
    { id: 'node-a', name: 'A' },
    { id: 'node-b', name: 'B' }
  ],
  views: [
    {
      id: 'view-1',
      name: 'View 1',
      items: [
        { id: 'node-a', tile: { x: 0, y: 0 } },
        { id: 'node-b', tile: { x: 2, y: 2 } }
      ],
      rectangles: [{ id: 'rect-1', from: { x: 5, y: 5 }, to: { x: 6, y: 6 } }]
    }
  ]
};

let probeActions: UiStateStore['actions'] | null = null;

const Probe = () => {
  const actions = useUiStateStore((state) => {
    return state.actions;
  });
  useEffect(() => {
    probeActions = actions;
  }, [actions]);
  const modeType = useUiStateStore((state) => {
    return state.mode.type;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const dim = useUiStateStore((state) => {
    return state.selectionDimEnabled;
  });
  const selectionCount = useUiStateStore((state) => {
    return state.selection.length;
  });
  const controls = useUiStateStore((state) => {
    return state.itemControls?.type ?? 'none';
  });
  const { currentView } = useScene();
  const nodeA = (currentView.items ?? []).find((i) => {
    return i.id === 'node-a';
  });

  return (
    <>
      <div data-testid="mode">{modeType}</div>
      <div data-testid="zoom">{String(zoom)}</div>
      <div data-testid="dim">{String(dim)}</div>
      <div data-testid="selected">{String(selectionCount)}</div>
      <div data-testid="controls">{controls}</div>
      <div data-testid="node-a">
        {nodeA ? `${nodeA.tile.x},${nodeA.tile.y}` : ''}
      </div>
    </>
  );
};

const mount = (editorMode: 'EDITABLE' | 'EXPLORABLE_READONLY' = 'EDITABLE') => {
  render(
    <Reticulyne initialData={initialData} editorMode={editorMode}>
      <Probe />
    </Reticulyne>
  );
};

const press = (init: Parameters<typeof fireEvent.keyDown>[1]) => {
  fireEvent.keyDown(document.body, init);
};

const mode = () => {
  return screen.getByTestId('mode').textContent;
};

describe('UXA-01 — Excalidraw tool hotkey alignment', () => {
  describe('letters', () => {
    test.each([
      ['r', 'RECTANGLE.DRAW'],
      ['t', 'TEXTBOX'],
      ['h', 'PAN'],
      ['c', 'CONNECTOR']
    ])('%s selects its tool', (key, expected) => {
      mount();
      press({ key });
      expect(mode()).toBe(expected);
    });

    test('A is the connector (Excalidraw arrow), not add-item', () => {
      mount();
      press({ key: 'a' });
      expect(mode()).toBe('CONNECTOR');
    });

    test('I is add-item, taking the job A used to have', () => {
      mount();
      press({ key: 'i' });
      expect(mode()).toBe('PLACE_ICON');
    });

    test('V and S both still select', () => {
      mount();
      press({ key: 'r' });
      press({ key: 'v' });
      expect(mode()).toBe('CURSOR');

      press({ key: 'r' });
      press({ key: 's' });
      expect(mode()).toBe('CURSOR');
    });

    test('uppercase works too', () => {
      mount();
      press({ key: 'R' });
      expect(mode()).toBe('RECTANGLE.DRAW');
    });
  });

  describe('number row', () => {
    test.each([
      ['Digit1', 'CURSOR'],
      ['Digit2', 'RECTANGLE.DRAW'],
      ['Digit5', 'CONNECTOR'],
      ['Digit8', 'TEXTBOX'],
      ['Digit9', 'PLACE_ICON']
    ])('%s selects its tool', (code, expected) => {
      mount();
      // Move off CURSOR first so Digit1 -> CURSOR is a real transition.
      press({ key: 'r' });
      press({ key: code.replace('Digit', ''), code });
      expect(mode()).toBe(expected);
    });
  });

  // MAX_ZOOM is 1 and the diagram opens at 1, so every test here zooms
  // OUT first — pressing `+` from the initial state is a no-op.
  describe('zoom', () => {
    test('bare 0 no longer resets zoom — it belongs to the tool row now', () => {
      mount();
      press({ key: '-' });
      const zoomed = screen.getByTestId('zoom').textContent;
      expect(zoomed).not.toBe('1');

      press({ key: '0', code: 'Digit0' });
      expect(screen.getByTestId('zoom').textContent).toBe(zoomed);
    });

    test('Ctrl+0 resets zoom', () => {
      mount();
      press({ key: '-' });
      expect(screen.getByTestId('zoom').textContent).not.toBe('1');

      press({ key: '0', code: 'Digit0', ctrlKey: true });
      expect(screen.getByTestId('zoom').textContent).toBe('1');
    });

    test('Ctrl+- and Ctrl+= zoom, matching Excalidraw', () => {
      mount();
      press({ key: '-', ctrlKey: true });
      const outZoom = Number(screen.getByTestId('zoom').textContent);
      expect(outZoom).toBeLessThan(1);

      press({ key: '=', ctrlKey: true });
      expect(Number(screen.getByTestId('zoom').textContent)).toBeGreaterThan(
        outZoom
      );
    });

    test('bare 1 is the Select tool, not reset-zoom', () => {
      mount();
      press({ key: '-' });
      const zoomed = screen.getByTestId('zoom').textContent;

      press({ key: 'r' });
      press({ key: '1', code: 'Digit1' });

      expect(mode()).toBe('CURSOR');
      expect(screen.getByTestId('zoom').textContent).toBe(zoomed);
    });
  });

  describe('selection dimming moved to Alt+I', () => {
    test('bare I no longer toggles it (it picks the add-item tool)', () => {
      mount();
      press({ key: 'i' });
      expect(screen.getByTestId('dim').textContent).toBe('false');
    });

    test('Alt+I toggles it, matched on e.code for macOS dead keys', () => {
      mount();
      press({ key: 'i', code: 'KeyI', altKey: true });
      expect(screen.getByTestId('dim').textContent).toBe('true');

      press({ key: 'i', code: 'KeyI', altKey: true });
      expect(screen.getByTestId('dim').textContent).toBe('false');
    });
  });

  describe('select all + deselect', () => {
    test('Ctrl+A selects every item, text box, connector and rectangle', () => {
      mount();
      press({ key: 'a', ctrlKey: true });
      // 2 nodes + 1 rectangle in the fixture.
      expect(screen.getByTestId('selected').textContent).toBe('3');
    });

    test('Ctrl+A does not fall through to the connector tool', () => {
      mount();
      press({ key: 'a', ctrlKey: true });
      expect(mode()).toBe('CURSOR');
    });

    test('Escape clears the whole selection', () => {
      mount();
      press({ key: 'a', ctrlKey: true });
      expect(screen.getByTestId('selected').textContent).toBe('3');

      press({ key: 'Escape' });
      expect(screen.getByTestId('selected').textContent).toBe('0');
    });

    test('Delete removes every selected item', () => {
      mount();
      press({ key: 'a', ctrlKey: true });
      press({ key: 'Delete' });

      expect(screen.getByTestId('selected').textContent).toBe('0');
    });
  });

  describe('Shift is not swallowed by the tool layer', () => {
    test('Shift+1 does not switch to the Select tool', () => {
      mount();
      press({ key: 'r' });
      press({ key: '!', code: 'Digit1', shiftKey: true });
      // Fit-to-view fired instead; the tool must be untouched.
      expect(mode()).toBe('RECTANGLE.DRAW');
    });

    test('Shift+2 does not switch to the Rectangle tool', () => {
      mount();
      press({ key: 'a', ctrlKey: true });
      press({ key: '@', code: 'Digit2', shiftKey: true });
      expect(mode()).toBe('CURSOR');
    });
  });

  // The bindings now come from the shared keymap in Accurona.
  describe('shared keymap', () => {
    test('selecting and panning work read-only', () => {
      mount('EXPLORABLE_READONLY');
      expect(mode()).toBe('PAN');
      press({ key: 'v' });
      expect(mode()).toBe('CURSOR');
      press({ key: 'h' });
      expect(mode()).toBe('PAN');
    });

    test('tools that edit stay off read-only', () => {
      mount('EXPLORABLE_READONLY');
      press({ key: 'r' });
      expect(mode()).toBe('PAN');
    });

    test('an arrow nudges; Ctrl + arrow does not (Excalidraw flowchart)', () => {
      mount();
      act(() => {
        probeActions!.setSelection([{ type: 'ITEM', id: 'node-a' }]);
      });
      press({ key: 'ArrowUp', ctrlKey: true });
      expect(screen.getByTestId('node-a').textContent).toBe('0,0');
      press({ key: 'ArrowUp' });
      expect(screen.getByTestId('node-a').textContent).toBe('0,1');
    });

    // Selecting already opens the panel; Enter puts the keyboard in it,
    // where a double-click would.
    test('Enter moves focus into the panel of the selected object', async () => {
      mount();
      act(() => {
        probeActions!.setSelection([{ type: 'RECTANGLE', id: 'rect-1' }]);
      });
      expect(screen.getByTestId('controls').textContent).toBe('RECTANGLE');
      press({ key: 'Enter' });
      await waitFor(() => {
        expect(
          document.activeElement?.closest('[data-item-controls]')
        ).not.toBeNull();
      });
    });

    test('Q (keep tool) and Ctrl+Shift+L (lock) are left unbound', () => {
      mount();
      press({ key: 'r' });
      press({ key: 'q' });
      press({ key: 'L', code: 'KeyL', ctrlKey: true, shiftKey: true });
      expect(mode()).toBe('RECTANGLE.DRAW');
    });
  });
});
