/**
 * @jest-environment jsdom
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { INITIAL_DATA } from 'src/config';
import { legacyModelToScene } from 'src/scene';
import type { Scene } from 'src/vendor/accurona-core';
import { DiagramShell } from '../DiagramShell';

// The e2e hook (window.__RETICULYNE_E2E__) hands the shell its diagram.
// Sweep 2026-09-30: that diagram opened without the bundled icon library,
// and one naming an icon it did not carry left a blank white page.

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

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

const bundled = [
  {
    id: 'server',
    name: 'Server',
    url: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
    collection: 'isoflow',
    isIsometric: true
  }
];

const naming = (icon: string): Scene => {
  const scene = legacyModelToScene(
    {
      ...INITIAL_DATA,
      title: 'Hooked',
      icons: [],
      items: [{ id: 'a', name: 'Rack server' }],
      views: [
        { id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }
      ]
    },
    'hooked'
  );
  return {
    ...scene,
    objects: scene.objects.map((object) => {
      return { ...object, icon };
    })
  };
};

const mount = (initialData: Scene) => {
  act(() => {
    render(
      <DiagramShell
        bundledIcons={bundled}
        colors={[{ id: 'c', value: '#000000' }]}
        initialData={initialData}
      />
    );
  });
};

test('a hooked diagram gets the bundled icons, as an imported one does', () => {
  mount(naming('server'));
  expect(screen.getByText('Rack server')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  const img = document.querySelector('img[src^="data:image/svg+xml"]');
  expect(img).not.toBeNull();
});

test('a hooked diagram naming an unknown icon says so instead of a blank page', () => {
  mount(naming('no-such-icon'));
  expect(screen.getByRole('alert').textContent).toMatch(
    /That diagram is not valid/
  );
  // The editor is there, on a new diagram.
  expect(
    screen.getByRole('application', { name: 'Diagram canvas' })
  ).toBeTruthy();
});
