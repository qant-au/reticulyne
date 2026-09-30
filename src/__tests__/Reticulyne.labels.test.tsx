/**
 * @jest-environment jsdom
 */
import { render, cleanup, act, screen } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import type { InitialData } from 'src/types';

// Sweep 2026-09-30: node names were drawn over. A node's own icon covered
// the bottom of its name ("Se_ver", "Sw_tch"), and a cross-floor riser ran
// through names. Names now draw in their own layer, above every icon and
// riser and below the riser's clickable marker.

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

const icon =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';

const building: InitialData = {
  title: 'Labels',
  icons: [{ id: 'i', name: 'I', url: icon, isIsometric: true }],
  colors: [],
  items: [
    { id: 'sw', name: 'Core switch', icon: 'i' },
    { id: 'srv', name: 'Server', icon: 'i' }
  ],
  views: [
    {
      id: 'ground',
      name: 'Ground',
      items: [{ id: 'sw', tile: { x: 0, y: 0 } }]
    },
    { id: 'l1', name: 'Level 1', items: [{ id: 'srv', tile: { x: 0, y: 0 } }] }
  ],
  connections: [{ id: 'c1', from: 'sw', to: 'srv' }]
};

const layerOf = (el: Element) => {
  const layers = Array.from(document.querySelectorAll('[data-scene-layer]'));
  return layers.indexOf(el.closest('[data-scene-layer]')!);
};

test('names draw above icons and risers, and below the stub marker', () => {
  act(() => {
    render(<Reticulyne initialData={building} />);
  });
  const name = screen.getByText('Core switch');
  const img = document.querySelector(`img[src="${icon}"]`)!;
  const riser = screen.getByTestId('floor-stub-riser-c1-sw');
  const marker = screen.getByTestId('floor-stub-c1-sw');

  expect(layerOf(name)).toBeGreaterThan(layerOf(img));
  expect(layerOf(name)).toBeGreaterThan(layerOf(riser));
  expect(layerOf(marker)).toBeGreaterThan(layerOf(name));
});
