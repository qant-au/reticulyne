/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import Isoflow from '../Isoflow';
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
  title: 'FEA12-01 fixture',
  icons: [],
  colors: [{ id: 'col-1', value: '#000000' }],
  items: [
    { id: 'node-a', name: 'A' },
    { id: 'node-b', name: 'B' }
  ],
  views: [
    {
      id: 'view-1',
      name: 'View 1',
      items: [
        { id: 'node-a', tile: { x: 0, y: 0 } },
        { id: 'node-b', tile: { x: 3, y: 0 } }
      ],
      connectors: [
        {
          id: 'connector-1',
          color: 'col-1',
          anchors: [
            { id: 'a1-start', ref: { item: 'node-a' } },
            { id: 'a1-end', ref: { item: 'node-b' } }
          ]
        }
      ]
    }
  ]
};

describe('FEA12-01 highlightedItemId', () => {
  test('renders without error when highlightedItemId is supplied', () => {
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={initialData}
        highlightedItemId="node-a"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error when highlightedItemId is undefined', () => {
    const onError = jest.fn();
    render(<Isoflow onError={onError} initialData={initialData} />);
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error when highlightedItemId matches a connector', () => {
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={initialData}
        highlightedItemId="connector-1"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error when highlightedItemId matches no item', () => {
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={initialData}
        highlightedItemId="nonexistent-id"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });
});
