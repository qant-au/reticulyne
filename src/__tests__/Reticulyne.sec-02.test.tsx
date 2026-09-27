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

// SEC-02: host writes are validated before they reach the store, and
// failures go to onValidationError rather than mutating it. The public
// write paths since 1.6 are setTitle (merge-then-validate against
// initialDataSchema) and applyPatch (validated against the patch schema).

afterEach(() => {
  cleanup();
});

type Api = ReturnType<typeof useReticulyne>;
type Captured = {
  setTitle: Api['setTitle'];
  applyPatch: Api['applyPatch'];
  get: Api['getModel'];
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
  const { setTitle, applyPatch, getModel } = useReticulyne();

  useEffect(() => {
    uiStateActions.setEditorMode('EDITABLE');
    uiStateActions.setOnValidationError(onValidationError);
  }, [uiStateActions, onValidationError]);

  useEffect(() => {
    onReady({ setTitle, applyPatch, get: getModel });
  }, [setTitle, applyPatch, getModel, onReady]);

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

describe('SEC-02 host writes are validated', () => {
  test('applies a valid title', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);

    act(() => {
      get().setTitle('edited');
    });

    expect(get().get().title).toBe('edited');
    expect(onValidationError).not.toHaveBeenCalled();
  });

  test('rejects a title over the schema limit', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);
    const before = get().get().title;

    act(() => {
      get().setTitle('x'.repeat(101));
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(get().get().title).toBe(before);
  });

  test('rejects a patch with an out-of-enum connector direction', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);
    const before = get().get();

    act(() => {
      get().applyPatch({
        // not in connectorDirectionOptions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connectors: { c1: { direction: 'SIDEWAYS' as any } }
      });
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(get().get()).toEqual(before);
  });

  test('rejects a patch that tries to re-anchor a connector', () => {
    const onValidationError = jest.fn();
    const get = renderHarness(onValidationError);

    act(() => {
      get().applyPatch({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connectors: { c1: { anchors: [] } as any }
      });
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
  });

  test('falls back to console.error when no onValidationError is supplied', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
    // Render without pushing a callback into the store.
    const get = renderHarness(undefined as unknown as () => void);

    act(() => {
      get().setTitle('x'.repeat(101));
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Model.set rejected'),
      expect.anything()
    );
    errorSpy.mockRestore();
  });
});
