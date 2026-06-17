/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import type { ZodIssue } from 'zod';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useSceneStore } from 'src/stores/sceneStore';
import { model as fixtureModel } from 'src/fixtures/model';
import type { InitialData, SceneStore } from 'src/types';

// QUA-07: lock-in tests for the imperative useReticulyne().Connector
// namespace (FEA5-07). `get` returns the merged connector, `update` is the
// history-bypassing write path (now schema-validated per SEC-03), and
// `pulse` writes a runtime sceneStore overlay that auto-expires and is
// superseded by a newer pulse on the same id.

// jsdom shims — the Renderer touches ResizeObserver + matchMedia on mount.
beforeAll(() => {
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

type Captured = {
  Connector: ReturnType<typeof useReticulyne>['Connector'];
  getScene: () => SceneStore;
};

const Probe = ({ onReady }: { onReady: (api: Captured) => void }) => {
  const { Connector } = useReticulyne();
  const getScene = useSceneStore((state) => {
    return state.actions.get;
  });

  useEffect(() => {
    onReady({ Connector, getScene });
  }, [Connector, getScene, onReady]);

  return null;
};

const renderHarness = (opts?: {
  onValidationError?: (issues: ZodIssue[]) => void;
  editorMode?: 'EDITABLE' | 'EXPLORABLE_READONLY' | 'NON_INTERACTIVE';
}) => {
  // App's internal load pipeline seeds the model + scene regardless of
  // editorMode, so the fixture is present even when mounted read-only.
  let captured: Captured | null = null;
  act(() => {
    render(
      <Reticulyne
        editorMode={opts?.editorMode ?? 'EDITABLE'}
        initialData={fixtureModel as InitialData}
        onValidationError={opts?.onValidationError}
      >
        <Probe
          onReady={(api) => {
            captured = api;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    return captured as Captured;
  };
};

describe('useReticulyne().Connector (QUA-07)', () => {
  test('get returns the connector merged with CONNECTOR_DEFAULTS', () => {
    const api = renderHarness();

    const conn = api().Connector.get('connector1');
    expect(conn).toBeDefined();
    // connector1 sets color + anchors; the rest comes from CONNECTOR_DEFAULTS.
    expect(conn?.color).toBe('color1');
    expect(conn?.style).toBe('SOLID');
    expect(conn?.width).toBe(10);
    expect(conn?.direction).toBe('START_TO_END');
    expect(conn?.glyph).toBe('triangle');
    expect(conn?.animated).toBe(false);
  });

  test('get returns undefined for an unknown id', () => {
    const api = renderHarness();
    expect(api().Connector.get('does-not-exist')).toBeUndefined();
  });

  test('update applies a valid patch without firing onValidationError', () => {
    const onValidationError = jest.fn();
    const api = renderHarness({ onValidationError });

    act(() => {
      api().Connector.update('connector1', { style: 'DASHED' });
    });

    expect(api().Connector.get('connector1')?.style).toBe('DASHED');
    expect(onValidationError).not.toHaveBeenCalled();
  });

  test('update rejects an out-of-enum patch and routes to onValidationError (SEC-03)', () => {
    const onValidationError = jest.fn();
    const api = renderHarness({ onValidationError });
    const before = api().Connector.get('connector1');

    act(() => {
      api().Connector.update('connector1', {
        // not in connectorDirectionOptions
        direction: 'SIDEWAYS'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(api().Connector.get('connector1')?.direction).toBe(
      before?.direction
    );
  });

  test('update is a no-op when mounted in NON_INTERACTIVE mode', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const api = renderHarness({ editorMode: 'NON_INTERACTIVE' });
    const before = api().Connector.get('connector1');

    act(() => {
      api().Connector.update('connector1', { style: 'DOTTED' });
    });

    expect(api().Connector.get('connector1')?.style).toBe(before?.style);
    warnSpy.mockRestore();
  });

  test('pulse writes an overlay, a newer pulse supersedes it, and it auto-expires', () => {
    jest.useFakeTimers();
    try {
      const api = renderHarness();

      act(() => {
        api().Connector.pulse('connector1', { durationMs: 1000 });
      });
      const first = api().getScene().connectorOverlays.connector1;
      expect(first).toBeDefined();
      const firstExpiry = first.pulseExpiresAt;

      // A second pulse before expiry replaces the overlay with a fresh
      // expiry timestamp (supersede semantics).
      act(() => {
        jest.advanceTimersByTime(400);
        api().Connector.pulse('connector1', { durationMs: 1000 });
      });
      const second = api().getScene().connectorOverlays.connector1;
      expect(second.pulseExpiresAt).not.toBe(firstExpiry);

      // The first pulse's cleanup timer fires at +1000ms total but must
      // NOT remove the live (superseded) overlay — the expiry guard keys
      // on the stored pulseExpiresAt.
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(api().getScene().connectorOverlays.connector1).toBeDefined();

      // The second pulse's own timer clears it once its full duration
      // elapses.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(api().getScene().connectorOverlays.connector1).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
