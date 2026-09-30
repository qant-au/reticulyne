/**
 * @jest-environment jsdom
 */
import {
  render,
  cleanup,
  act,
  screen,
  fireEvent
} from '@testing-library/react';
import Reticulyne from 'src/Reticulyne';
import type { InitialData } from 'src/types';

// Sweep 2026-09-30: the Layers popover was a modal, so the rest of the page
// was aria-hidden while it was open, and a row's eye tooltip covered the
// next row's name field.

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
});

const diagram: InitialData = {
  title: 'Layers',
  icons: [],
  colors: [],
  items: [{ id: 'a', name: 'Router' }],
  views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
};

const openLayers = () => {
  act(() => {
    render(<Reticulyne initialData={diagram} />);
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Add layer' }));
  });
};

test('the Layers panel is non-modal: the page stays in the accessibility tree', () => {
  openLayers();
  const panel = screen.getByRole('dialog', { name: 'Layers' });
  expect(panel.getAttribute('aria-modal')).toBe('false');
  // getByRole skips aria-hidden subtrees, so these throw under a modal.
  expect(screen.getByRole('button', { name: 'Main menu' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Zoom in (+)' })).toBeTruthy();
  expect(document.querySelectorAll('[aria-hidden="true"] button').length).toBe(
    0
  );
});

test('Escape in the panel closes it', () => {
  openLayers();
  act(() => {
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Layer name' }), {
      key: 'Escape'
    });
  });
  expect(screen.queryByRole('dialog', { name: 'Layers' })).toBeNull();
});

test('a row tooltip opens to the side, not over the next row', async () => {
  openLayers();
  act(() => {
    fireEvent.mouseOver(screen.getByRole('button', { name: 'Hide Layer 1' }));
  });
  const tip = await screen.findByRole('tooltip');
  expect(tip.textContent).toBe('Hide layer');
  expect(tip.getAttribute('data-popper-placement')).toMatch(/^left/);
});
