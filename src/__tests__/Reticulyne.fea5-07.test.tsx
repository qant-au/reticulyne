/**
 * @jest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react';
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
  // jsdom doesn't implement Element.scrollTo, which ExpandableLabel
  // touches on mount. Stub it so the Node tree renders past the label.
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

// Minimal fixture with two nodes — enough to assert that the
// nodeIndicatorComponent slot stamps once per node.
const minimalInitialData: InitialData = {
  version: '',
  title: 'FEA5-07 fixture',
  icons: [],
  colors: [],
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
        { id: 'node-b', tile: { x: 2, y: 0 } }
      ]
    }
  ]
};

describe('FEA5-07 nodeIndicatorComponent', () => {
  test('renders inside each node when supplied', () => {
    const onError = jest.fn();
    render(
      <Reticulyne
        onError={onError}
        initialData={minimalInitialData}
        nodeIndicatorComponent={({ item }) => {
          return <span data-testid={`indicator-${item.id}`}>indicator</span>;
        }}
      />
    );
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getAllByTestId(/^indicator-/)).toHaveLength(2);
    expect(screen.getAllByTestId('node-indicator-slot')).toHaveLength(2);
  });

  test('renders no slot when omitted', () => {
    const onError = jest.fn();
    render(<Reticulyne onError={onError} initialData={minimalInitialData} />);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId('node-indicator-slot')).toHaveLength(0);
  });

  test('passes the ModelItem and ViewItem to the indicator', () => {
    render(
      <Reticulyne
        initialData={minimalInitialData}
        nodeIndicatorComponent={({ item, view }) => {
          return (
            <span
              data-testid={`probe-${item.id}`}
              data-tile-x={String(view.tile.x)}
              data-tile-y={String(view.tile.y)}
            >
              probe
            </span>
          );
        }}
      />
    );
    const probeA = screen.getByTestId('probe-node-a');
    expect(probeA.getAttribute('data-tile-x')).toBe('0');
    expect(probeA.getAttribute('data-tile-y')).toBe('0');
    const probeB = screen.getByTestId('probe-node-b');
    expect(probeB.getAttribute('data-tile-x')).toBe('2');
  });
});
