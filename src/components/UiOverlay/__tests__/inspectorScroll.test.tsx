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

// BUG15-50 (sweep 2026-09-30, E50): a drag on the inspector's Label height
// slider was recorded as a press on the canvas, began a marquee under the
// panel and closed the inspector.
test('a drag that starts in the inspector does not start a marquee', () => {
  act(() => {
    render(
      <Reticulyne initialData={diagram}>
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui!.actions.setSelection([{ type: 'ITEM', id: 'a' }]);
    ui!.actions.setItemControls({ type: 'ITEM', id: 'a' });
  });
  const slider = screen.getByRole('slider');
  const at = (type: string, target: EventTarget, x: number) => {
    act(() => {
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: 300,
          button: 0
        })
      );
    });
  };
  at('pointerdown', slider, 100);
  at('pointermove', window, 300);
  at('pointermove', window, 600);
  expect(ui!.mode.type).not.toBe('MARQUEE');
  at('pointerup', slider, 600);
  expect(ui!.itemControls).toEqual({ type: 'ITEM', id: 'a' });
  expect(screen.getByText('Edit object')).toBeTruthy();
});
