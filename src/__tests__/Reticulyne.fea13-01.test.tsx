/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import Reticulyne from '../Reticulyne';
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
  title: 'FEA13-01 fixture',
  icons: [],
  colors: [{ id: 'col-1', value: '#4A90D9' }],
  items: [
    { id: 'node-a', name: 'Alpha' },
    { id: 'node-b', name: 'Beta' }
  ],
  views: [
    {
      id: 'view-1',
      name: 'View 1',
      items: [
        { id: 'node-a', tile: { x: 0, y: 0 } },
        { id: 'node-b', tile: { x: 4, y: 0 } }
      ],
      connectors: [
        {
          id: 'conn-1',
          color: 'col-1',
          anchors: [
            { id: 'a-start', ref: { item: 'node-a' } },
            { id: 'a-end', ref: { item: 'node-b' } }
          ]
        }
      ]
    }
  ]
};

describe('FEA13-01 SVG export menu option', () => {
  test('renders without error with EXPORT.SVG in mainMenuOptions', () => {
    const onError = jest.fn();
    render(
      <Reticulyne
        onError={onError}
        initialData={initialData}
        mainMenuOptions={['EXPORT.SVG']}
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error with full default menu', () => {
    const onError = jest.fn();
    render(<Reticulyne onError={onError} initialData={initialData} />);
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error with EXPORT.SVG alongside PNG and PDF', () => {
    const onError = jest.fn();
    render(
      <Reticulyne
        onError={onError}
        initialData={initialData}
        mainMenuOptions={['EXPORT.PNG', 'EXPORT.PDF', 'EXPORT.SVG']}
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('renders without error with empty mainMenuOptions', () => {
    const onError = jest.fn();
    render(
      <Reticulyne
        onError={onError}
        initialData={initialData}
        mainMenuOptions={[]}
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });
});
