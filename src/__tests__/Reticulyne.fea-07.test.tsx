/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { InitialData } from 'src/types';

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

const initialData: InitialData = {
  version: '',
  title: 'FEA-07 fixture',
  icons: [],
  colors: [{ id: 'col-1', value: '#000000' }],
  items: [{ id: 'node-a', name: 'A' }],
  views: [
    {
      id: 'view-1',
      name: 'View 1',
      items: [{ id: 'node-a', tile: { x: 0, y: 0 } }]
    }
  ]
};

// Driver child: surfaces the live interaction mode so the test can observe
// whether the `R` (rectangle tool) shortcut fired.
const ModeProbe = () => {
  const modeType = useUiStateStore((state) => {
    return state.mode.type;
  });
  return <div data-testid="mode">{modeType}</div>;
};

describe('FEA-07 keyboard-shortcut scoping', () => {
  test('default: a keydown on the document fires the shortcut (global window listener)', () => {
    render(
      <Reticulyne initialData={initialData}>
        <ModeProbe />
      </Reticulyne>
    );

    expect(screen.getByTestId('mode').textContent).toBe('CURSOR');

    fireEvent.keyDown(document.body, { key: 'r' });

    expect(screen.getByTestId('mode').textContent).toBe('RECTANGLE.DRAW');
  });

  test('scoped: a keydown outside the canvas is ignored; one on the canvas fires', () => {
    render(
      <Reticulyne
        initialData={initialData}
        enableGlobalKeyboardShortcuts={false}
      >
        <ModeProbe />
      </Reticulyne>
    );

    expect(screen.getByTestId('mode').textContent).toBe('CURSOR');

    // Host-page keystroke (outside the renderer subtree) must NOT be hijacked.
    fireEvent.keyDown(document.body, { key: 'r' });
    expect(screen.getByTestId('mode').textContent).toBe('CURSOR');

    // A keystroke routed to the (now focusable) canvas still works.
    const canvas = screen.getByRole('application');
    expect(canvas.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(canvas, { key: 'r' });
    expect(screen.getByTestId('mode').textContent).toBe('RECTANGLE.DRAW');
  });
});
