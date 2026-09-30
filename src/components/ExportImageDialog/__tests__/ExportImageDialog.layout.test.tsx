/**
 * @jest-environment jsdom
 */
import { render, cleanup, act, screen } from '@testing-library/react';
import { useEffect } from 'react';
import Reticulyne from 'src/Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { InitialData, UiStateStore } from 'src/types';

// Sweep 2026-09-30 (A22): the dialog moved 36px between loading and ready,
// because the loader was a fixed 500x300 box and the buttons appeared only
// with the preview.

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
  title: 'Export',
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

test('while the preview renders, the loader has its size and the buttons are there', async () => {
  act(() => {
    render(
      <Reticulyne initialData={diagram}>
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui!.actions.setDialog('EXPORT_IMAGE');
  });

  const dialog = await screen.findByRole('dialog', { name: 'Export as image' });
  const loader = await screen.findByTestId('export-image-loading');
  expect(dialog.contains(loader)).toBe(true);
  // The preview's box: the diagram's width and aspect, not a fixed 500x300.
  expect(loader.style.width).not.toBe('500px');
  expect(loader.style.aspectRatio).toMatch(/\d+ \/ \d+/);

  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  const download = screen.getByRole('button', { name: 'Download as PNG' });
  expect((download as HTMLButtonElement).disabled).toBe(true);
});
