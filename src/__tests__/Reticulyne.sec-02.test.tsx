/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import type { ZodIssue } from 'zod';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'src/styles/theme';
import { ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { HistoryProvider } from 'src/stores/historyStore';
import { useReticulyne } from '../Reticulyne';

// SEC-02: useReticulyne().Model.set now merge-then-validates its payload
// against initialDataSchema and routes failures to onValidationError,
// rather than mutating the store unconditionally in EDITABLE mode.

afterEach(() => {
  cleanup();
});

type Captured = {
  set: ReturnType<typeof useReticulyne>['Model']['set'];
  get: ReturnType<typeof useReticulyne>['Model']['get'];
};

const HookProbe = ({
  onValidationError,
  onReady
}: {
  onValidationError: (issues: ZodIssue[]) => void;
  onReady: (api: Captured) => void;
}) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { Model } = useReticulyne();

  useEffect(() => {
    uiStateActions.setEditorMode('EDITABLE');
    uiStateActions.setOnValidationError(onValidationError);
  }, [uiStateActions, onValidationError]);

  useEffect(() => {
    onReady({ set: Model.set, get: Model.get });
  }, [Model, onReady]);

  return null;
};

const renderHarness = (onValidationError: (issues: ZodIssue[]) => void) => {
  let captured: Captured | null = null;
  act(() => {
    render(
      <ThemeProvider theme={theme}>
        <ModelProvider>
          <SceneProvider>
            <UiStateProvider>
              <HistoryProvider>
                <HookProbe
                  onValidationError={onValidationError}
                  onReady={(api) => {
                    captured = api;
                  }}
                />
              </HistoryProvider>
            </UiStateProvider>
          </SceneProvider>
        </ModelProvider>
      </ThemeProvider>
    );
  });
  return () => {
    return captured as Captured;
  };
};

describe('SEC-02 Model.set merge-then-validate', () => {
  test('applies a valid partial', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);

    act(() => {
      get().set({ title: 'edited' });
    });

    expect(get().get().title).toBe('edited');
    expect(onValidationError).not.toHaveBeenCalled();
  });

  test('rejects a partial carrying a disallowed icon url (SEC-01 gate)', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);
    const before = get().get();

    act(() => {
      get().set({
        icons: [{ id: 'i1', name: 'Bad', url: 'javascript:alert(1)' }]
      });
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(get().get().icons).toEqual(before.icons);
  });

  test('rejects a partial with an out-of-enum connector direction', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);
    const before = get().get();

    act(() => {
      get().set({
        items: [],
        views: [
          {
            id: 'v1',
            name: 'V',
            items: [],
            connectors: [
              {
                id: 'c1',
                // not in connectorDirectionOptions
                direction: 'SIDEWAYS',
                anchors: [
                  { id: 'a1', ref: { tile: { x: 0, y: 0 } } },
                  { id: 'a2', ref: { tile: { x: 1, y: 0 } } }
                ]
              }
            ]
          }
        ]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(get().get().views).toEqual(before.views);
  });

  test('falls back to console.error when no onValidationError is supplied', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
    // Render without pushing a callback into the store.
    const get = renderHarness(undefined as unknown as () => void);

    act(() => {
      get().set({
        icons: [{ id: 'i1', name: 'Bad', url: 'javascript:alert(1)' }]
      });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Model.set rejected'),
      expect.anything()
    );
    errorSpy.mockRestore();
  });
});
