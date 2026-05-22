/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import Isoflow from '../Isoflow';
import { connectorSchema } from 'src/schemas/connector';
import type { InitialData, Connector } from 'src/types';

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

// Helper: build a minimal InitialData with one connector between two
// items, optionally overriding the connector fields under test.
const fixtureWithConnector = (overrides: Partial<Connector>): InitialData => {
  return {
    version: '',
    title: 'FEA7-01 fixture',
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
            animated: true,
            anchors: [
              { id: 'anc-start', ref: { item: 'node-a' } },
              { id: 'anc-end', ref: { item: 'node-b' } }
            ],
            ...overrides
          }
        ]
      }
    ]
  };
};

describe('FEA7-01 schema', () => {
  test('accepts animationRate within [0, 1]', () => {
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationRate: 0
      }).success
    ).toBe(true);
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationRate: 0.5
      }).success
    ).toBe(true);
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationRate: 1
      }).success
    ).toBe(true);
  });

  test('rejects animationRate outside [0, 1]', () => {
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationRate: -0.1
      }).success
    ).toBe(false);
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationRate: 1.5
      }).success
    ).toBe(false);
  });

  test('accepts the three animationFlow enum values', () => {
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationFlow: 'forward'
      }).success
    ).toBe(true);
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationFlow: 'reverse'
      }).success
    ).toBe(true);
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationFlow: 'both'
      }).success
    ).toBe(true);
  });

  test('rejects unknown animationFlow values', () => {
    expect(
      connectorSchema.safeParse({
        id: 'c',
        anchors: [],
        animationFlow: 'sideways'
      }).success
    ).toBe(false);
  });

  test('omitting the new fields still parses', () => {
    expect(connectorSchema.safeParse({ id: 'c', anchors: [] }).success).toBe(
      true
    );
  });
});

describe('FEA7-01 renderer', () => {
  test('animationRate=0 suppresses the looping glyph', () => {
    const { container } = render(
      <Isoflow
        enableAnimation
        initialData={fixtureWithConnector({ animationRate: 0 })}
      />
    );
    // Static direction-icon glyphs render via <GlyphRenderer> but
    // without <animateMotion>; an animating loop is the only place
    // <animateMotion> appears in the connector tree.
    expect(container.querySelectorAll('animateMotion').length).toBe(0);
  });

  test('animationRate=0.5 doubles the per-loop duration', () => {
    const { container } = render(
      <Isoflow
        enableAnimation
        initialData={fixtureWithConnector({ animationRate: 0.5 })}
      />
    );
    // ANIMATION_DURATION_SECONDS is 2; rate 0.5 → 4s.
    const motion = container.querySelector('animateMotion');
    expect(motion?.getAttribute('dur')).toBe('4s');
  });

  test('animationRate undefined keeps the legacy 2s duration', () => {
    const { container } = render(
      <Isoflow enableAnimation initialData={fixtureWithConnector({})} />
    );
    const motion = container.querySelector('animateMotion');
    expect(motion?.getAttribute('dur')).toBe('2s');
  });

  test('animationFlow "both" renders two glyphs travelling opposite ways', () => {
    const { container } = render(
      <Isoflow
        enableAnimation
        initialData={fixtureWithConnector({ animationFlow: 'both' })}
      />
    );
    const motions = container.querySelectorAll('animateMotion');
    expect(motions.length).toBe(2);
    const keyPoints = Array.from(motions).map((m) => {
      return m.getAttribute('keyPoints');
    });
    expect(keyPoints).toContain('0;1');
    expect(keyPoints).toContain('1;0');
  });

  test('animationFlow "reverse" overrides the direction-derived flow', () => {
    const { container } = render(
      <Isoflow
        enableAnimation
        initialData={fixtureWithConnector({
          // direction defaults to START_TO_END (forward), so this
          // override is the load-bearing assertion.
          animationFlow: 'reverse'
        })}
      />
    );
    const motion = container.querySelector('animateMotion');
    expect(motion?.getAttribute('keyPoints')).toBe('1;0');
  });

  test('animationFlow undefined falls back to direction-derived flow', () => {
    const { container } = render(
      <Isoflow
        enableAnimation
        initialData={fixtureWithConnector({ direction: 'END_TO_START' })}
      />
    );
    const motion = container.querySelector('animateMotion');
    // Pre-FEA7 behaviour: END_TO_START direction implies reverse.
    expect(motion?.getAttribute('keyPoints')).toBe('1;0');
  });
});
