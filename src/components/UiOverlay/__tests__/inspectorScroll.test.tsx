/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act, screen } from '@testing-library/react';
import Reticulyne from 'src/Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { InitialData, UiStateStore } from 'src/types';

// Sweep 2026-09-30 (A04/A13): the inspector hid its scrollbar, so its
// bottom (the Redacted layer caption, Delete) looked cut off, with
// nothing saying the panel scrolled.

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
  title: 'Inspector',
  icons: [],
  colors: [],
  items: [{ id: 'a', name: 'Router' }],
  views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
};

let ui: UiStateStore | null = null;
const Probe = () => {
  const state = useUiStateStore((s) => {
    return s;
  });
  useEffect(() => {
    ui = state;
  }, [state]);
  return null;
};

test('the inspector scrolls with a visible scrollbar', () => {
  act(() => {
    render(
      <Reticulyne initialData={diagram}>
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui!.actions.setItemControls({ type: 'ITEM', id: 'a' });
  });

  const panel = screen.getByText('Edit object').closest('.MuiCard-root');
  expect(panel).not.toBeNull();
  expect(getComputedStyle(panel!).overflowY).toBe('auto');

  // No rule hides the panel's scrollbar.
  const css = [...document.querySelectorAll('style')]
    .map((s) => {
      return s.textContent ?? '';
    })
    .join('\n');
  const hidden = [...panel!.classList].some((cls) => {
    return new RegExp(
      `\\.${cls}::-webkit-scrollbar\\s*\\{[^}]*display:\\s*none`
    ).test(css);
  });
  expect(hidden).toBe(false);
});
