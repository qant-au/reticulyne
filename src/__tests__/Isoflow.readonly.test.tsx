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
import { useIsoflow } from '../Isoflow';

afterEach(() => {
  cleanup();
});

type Captured = {
  set: ReturnType<typeof useIsoflow>['Model']['set'];
  get: ReturnType<typeof useIsoflow>['Model']['get'];
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
  const { Model } = useIsoflow();

  useEffect(() => {
    uiStateActions.setEditorMode(mode);
  }, [mode, uiStateActions]);

  useEffect(() => {
    onReady({ set: Model.set, get: Model.get });
  }, [Model, onReady]);

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
            <HookProbe mode={mode} onReady={onReady} />
          </UiStateProvider>
        </SceneProvider>
      </ModelProvider>
    </ThemeProvider>
  );
};

describe('useIsoflow read-only enforcement', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('rejects Model.set in EXPLORABLE_READONLY mode', () => {
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
      captured!.set({ title: 'mutated' });
    });
    const after = captured!.get();

    expect(after.title).toBe(before.title);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Refusing model mutation')
    );
  });

  test('rejects Model.set in NON_INTERACTIVE mode', () => {
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
      captured!.set({ title: 'mutated' });
    });
    expect(captured!.get().title).toBe(before.title);
  });

  test('allows Model.set in EDITABLE mode', () => {
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
      captured!.set({ title: 'edited' });
    });
    expect(captured!.get().title).toBe('edited');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
