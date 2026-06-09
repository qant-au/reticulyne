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

// Two connectors so the slot-count assertion is unambiguous (one
// connector would still pass a `.toHaveLength(1)` even if the layer
// were leaking the indicator into an unrelated node).
const initialData: InitialData = {
  version: '',
  title: 'FEA7-03 fixture',
  icons: [],
  colors: [{ id: 'col-1', value: '#000000' }],
  items: [
    { id: 'node-a', name: 'A' },
    { id: 'node-b', name: 'B' },
    { id: 'node-c', name: 'C' }
  ],
  views: [
    {
      id: 'view-1',
      name: 'View 1',
      items: [
        { id: 'node-a', tile: { x: 0, y: 0 } },
        { id: 'node-b', tile: { x: 3, y: 0 } },
        { id: 'node-c', tile: { x: 6, y: 0 } }
      ],
      connectors: [
        {
          id: 'connector-1',
          color: 'col-1',
          anchors: [
            { id: 'a1-start', ref: { item: 'node-a' } },
            { id: 'a1-end', ref: { item: 'node-b' } }
          ]
        },
        {
          id: 'connector-2',
          color: 'col-1',
          anchors: [
            { id: 'a2-start', ref: { item: 'node-b' } },
            { id: 'a2-end', ref: { item: 'node-c' } }
          ]
        }
      ]
    }
  ]
};

describe('FEA7-03 connectorIndicatorComponent', () => {
  test('renders one slot per connector when supplied', () => {
    const onError = jest.fn();
    render(
      <Reticulyne
        onError={onError}
        initialData={initialData}
        connectorIndicatorComponent={({ connector }) => {
          return <span data-testid={`probe-${connector.id}`}>indicator</span>;
        }}
      />
    );
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('connector-indicator-slot')).toHaveLength(2);
    expect(screen.getByTestId('probe-connector-1')).toBeTruthy();
    expect(screen.getByTestId('probe-connector-2')).toBeTruthy();
  });

  test('renders no slot when omitted', () => {
    const onError = jest.fn();
    render(<Reticulyne onError={onError} initialData={initialData} />);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId('connector-indicator-slot')).toHaveLength(0);
  });

  test('passes a connector with id and anchors to the indicator', () => {
    const captured: { id: string; anchorCount: number }[] = [];
    render(
      <Reticulyne
        initialData={initialData}
        connectorIndicatorComponent={({ connector }) => {
          captured.push({
            id: connector.id,
            anchorCount: connector.anchors.length
          });
          return null;
        }}
      />
    );
    const seen = captured.map((c) => {
      return c.id;
    });
    expect(seen).toContain('connector-1');
    expect(seen).toContain('connector-2');
    captured.forEach((c) => {
      expect(c.anchorCount).toBe(2);
    });
  });
});
