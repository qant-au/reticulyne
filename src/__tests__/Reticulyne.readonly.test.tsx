/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'src/styles/theme';
import { ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { HistoryProvider } from 'src/stores/historyStore';
import { useReticulyne } from '../Reticulyne';

afterEach(() => {
  cleanup();
});

// 1.6 removed the Model escape hatch; setTitle writes through the same
// gated path, so the gate is exercised through it.
type Captured = {
  set: ReturnType<typeof useReticulyne>['setTitle'];
  get: ReturnType<typeof useReticulyne>['getModel'];
};

const HookProbe = ({
  mode,
  onReady
}: {
  mode: 'EDITABLE' | 'EXPLORABLE_READONLY' | 'NON_INTERACTIVE';
  onReady: (api: Captured) => void;
}) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { setTitle, getModel } = useReticulyne();

  useEffect(() => {
    uiStateActions.setEditorMode(mode);
  }, [mode, uiStateActions]);

  useEffect(() => {
    onReady({ set: setTitle, get: getModel });
  }, [setTitle, getModel, onReady]);

  return null;
};

const Harness = ({
  mode,
  onReady
}: {
  mode: 'EDITABLE' | 'EXPLORABLE_READONLY' | 'NON_INTERACTIVE';
  onReady: (api: Captured) => void;
}) => {
  return (
    <ThemeProvider theme={theme}>
      <ModelProvider>
        <SceneProvider>
          <UiStateProvider>
            <HistoryProvider>
              <HookProbe mode={mode} onReady={onReady} />
            </HistoryProvider>
          </UiStateProvider>
        </SceneProvider>
      </ModelProvider>
    </ThemeProvider>
  );
};

describe('useReticulyne read-only enforcement', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('rejects setTitle in EXPLORABLE_READONLY mode', () => {
    let captured: Captured | null = null;
    act(() => {
      render(
        <Harness
          mode="EXPLORABLE_READONLY"
          onReady={(api) => {
            captured = api;
          }}
        />
      );
    });

    expect(captured).not.toBeNull();
    const before = captured!.get();
    act(() => {
      captured!.set('mutated');
    });
    const after = captured!.get();

    expect(after.title).toBe(before.title);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Refusing model mutation')
    );
  });

  test('rejects setTitle in NON_INTERACTIVE mode', () => {
    let captured: Captured | null = null;
    act(() => {
      render(
        <Harness
          mode="NON_INTERACTIVE"
          onReady={(api) => {
            captured = api;
          }}
        />
      );
    });

    const before = captured!.get();
    act(() => {
      captured!.set('mutated');
    });
    expect(captured!.get().title).toBe(before.title);
  });

  test('allows setTitle in EDITABLE mode', () => {
    let captured: Captured | null = null;
    act(() => {
      render(
        <Harness
          mode="EDITABLE"
          onReady={(api) => {
            captured = api;
          }}
        />
      );
    });

    act(() => {
      captured!.set('edited');
    });
    expect(captured!.get().title).toBe('edited');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
