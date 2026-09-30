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

// Sweep 2026-09-30: an unlabelled colour input lay over the Background
// colour button and took its clicks, and the chosen colour reset when the
// dialog reopened.
test('the Background color button opens a labelled picker and the colour survives a reopen', async () => {
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
  const input = (await screen.findByLabelText('Background color', {
    selector: 'input'
  })) as HTMLInputElement;
  expect(input.type).toBe('color');
  expect(input.tabIndex).toBe(-1);
  const button = screen.getByRole('button', { name: /^Background color #/ });
  const clicked = jest.fn();
  input.addEventListener('click', clicked);
  act(() => {
    fireEvent.click(button);
  });
  expect(clicked).toHaveBeenCalled();
  act(() => {
    fireEvent.change(input, { target: { value: '#ffe0e0' } });
  });
  expect(
    screen.getByRole('button', { name: 'Background color #ffe0e0' })
  ).toBeTruthy();

  act(() => {
    ui!.actions.setDialog(null);
  });
  act(() => {
    ui!.actions.setDialog('EXPORT_SVG');
  });
  expect(
    await screen.findByRole('button', { name: 'Background color #ffe0e0' })
  ).toBeTruthy();
  act(() => {
    ui!.actions.setDialog(null);
  });
  act(() => {
    ui!.actions.setDialog('EXPORT_IMAGE');
  });
  expect(
    await screen.findByRole('button', { name: 'Background color #ffe0e0' })
  ).toBeTruthy();
});
