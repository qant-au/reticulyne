/**
 * @jest-environment jsdom
 */
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { SCENE_FORMAT } from 'src/core';
import type { Model } from 'src/types';

// Code review 2026-10-19: a file whose built-in icons carry no flat drawing
// took one only from the editor's previous library, which is empty the first
// time an embedder mounts the editor, so its built-in devices drew their
// isometric image in the flat view.

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

test('a file opened on first mount draws its built-in devices flat', () => {
  const router = 'reticulyne-router';
  const onModelUpdated = jest.fn<void, [Model]>();
  act(() => {
    render(
      <Reticulyne
        onModelUpdated={onModelUpdated}
        initialData={
          {
            format: SCENE_FORMAT,
            version: 2,
            id: 'old',
            objects: [{ id: 'r', name: 'Router', icon: router }],
            icons: [
              {
                id: router,
                name: 'Router',
                url: 'data:image/svg+xml,iso',
                isIsometric: true
              }
            ],
            views: [
              {
                id: 'v',
                kind: 'iso',
                name: 'Main',
                placements: [{ object: 'r', tile: { x: 0, y: 0 } }]
              }
            ]
          } as never
        }
      />
    );
  });
  expect(onModelUpdated).toHaveBeenCalled();
  const model = onModelUpdated.mock.calls.at(-1)![0];
  const icon = model.icons.find((i) => {
    return i.id === 'reticulyne-router';
  });
  // The file's own image is kept; the flat one is the built-in drawing's.
  expect(icon?.url).toBe('data:image/svg+xml,iso');
  expect(icon?.flatUrl).toMatch(/^data:image\/svg\+xml,/);
});
