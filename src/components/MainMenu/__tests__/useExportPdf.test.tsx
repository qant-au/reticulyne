/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne from 'src/Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { InitialData, UiStateActions } from 'src/types';
import { useDownloadPdf } from '../useExportPdf';

// Sweep 2026-09-30: the PDF, a picture of the live canvas, showed the
// faint ghosts of the other floors along its top.

const captured: { ghosts: number; showOtherFloors: boolean }[] = [];
let ui: UiStateActions | null = null;

jest.mock('src/utils', () => {
  const actual = jest.requireActual('src/utils');
  return {
    ...actual,
    exportAsPdf: jest.fn(async () => {
      captured.push({
        ghosts: document.querySelectorAll('[data-testid^="other-floor-"]')
          .length,
        showOtherFloors: ui!.get().showOtherFloors
      });
    })
  };
});

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

const floors: InitialData = {
  title: 'Floors',
  icons: [],
  colors: [],
  items: [
    { id: 'a', name: 'Switch' },
    { id: 'b', name: 'AP' }
  ],
  views: [
    { id: 'g', name: 'Ground', items: [{ id: 'a', tile: { x: 0, y: 0 } }] },
    { id: 'l1', name: 'Level 1', items: [{ id: 'b', tile: { x: 2, y: 0 } }] }
  ]
};

test('the PDF capture leaves out other floors, and puts them back after', async () => {
  let download: ((includeRedacted: boolean) => Promise<void>) | null = null;
  const Probe = () => {
    const d = useDownloadPdf();
    const actions = useUiStateStore((s) => {
      return s.actions;
    });
    useEffect(() => {
      download = d;
      ui = actions;
    }, [d, actions]);
    return null;
  };
  act(() => {
    render(
      <Reticulyne initialData={floors} editorMode="EDITABLE">
        <Probe />
      </Reticulyne>
    );
  });
  expect(
    document.querySelectorAll('[data-testid^="other-floor-"]').length
  ).toBeGreaterThan(0);

  await act(async () => {
    await download!(true);
  });

  expect(captured).toEqual([{ ghosts: 0, showOtherFloors: false }]);
  expect(ui!.get().showOtherFloors).toBe(true);
  expect(
    document.querySelectorAll('[data-testid^="other-floor-"]').length
  ).toBeGreaterThan(0);
});
