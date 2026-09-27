/**
 * @jest-environment jsdom
 */
import { useEffect, useRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { model as fixtureModel } from 'src/fixtures/model';
import { fingerprintModel, performSave } from 'src/utils/save';
import type { Model, SaveStatus, UiStateActions } from 'src/types';

// ROADMAP 2.3: save status, dirty tracking and opt-in auto-save.

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
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
  jest.useRealTimers();
});

describe('performSave', () => {
  const store = () => {
    let status: SaveStatus = {
      state: 'idle',
      isDirty: true,
      lastSavedAt: null,
      savedFingerprint: null,
      error: null
    };
    return {
      getStatus: () => {
        return status;
      },
      setStatus: (p: Partial<SaveStatus>) => {
        status = { ...status, ...p };
      }
    };
  };

  test('awaits the host and records what was saved', async () => {
    const deps = store();
    let resolve: () => void = () => {};
    const pending = performSave(
      () => {
        return new Promise<void>((r) => {
          resolve = r;
        });
      },
      fixtureModel,
      deps
    );
    expect(deps.getStatus().state).toBe('saving');
    resolve();
    await pending;
    expect(deps.getStatus().state).toBe('saved');
    expect(deps.getStatus().savedFingerprint).toBe(
      fingerprintModel(fixtureModel)
    );
  });

  test('a rejection is an error with its message', async () => {
    const deps = store();
    await performSave(
      () => {
        return Promise.reject(new Error('backend down'));
      },
      fixtureModel,
      deps
    );
    expect(deps.getStatus()).toMatchObject({
      state: 'error',
      error: 'backend down'
    });
  });

  test('a call while one is in flight is ignored', async () => {
    const deps = store();
    deps.setStatus({ state: 'saving' });
    const onSave = jest.fn();
    await performSave(onSave, fixtureModel, deps);
    expect(onSave).not.toHaveBeenCalled();
  });
});

type Api = ReturnType<typeof useReticulyne> & {
  status: () => SaveStatus;
  ui: UiStateActions;
};

const Probe = ({ onReady }: { onReady: (api: Api) => void }) => {
  const api = useReticulyne();
  const ui = useUiStateStore((state) => {
    return state.actions;
  });
  const status = useUiStateStore((state) => {
    return state.saveStatus;
  });
  const ref = useRef(status);
  useEffect(() => {
    ref.current = status;
  }, [status]);
  useEffect(() => {
    onReady({
      ...api,
      ui,
      status: () => {
        return ref.current;
      }
    });
  }, [api, ui, onReady]);
  return null;
};

const mount = (props: Partial<Parameters<typeof Reticulyne>[0]>) => {
  let captured: Api | null = null;
  act(() => {
    render(
      <Reticulyne editorMode="EDITABLE" initialData={fixtureModel} {...props}>
        <Probe
          onReady={(api) => {
            captured = api;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    return captured!;
  };
};

describe('save controller (2.3)', () => {
  test('a loaded diagram is clean; an edit makes it dirty', () => {
    const api = mount({ onSave: jest.fn() });
    expect(api().status().isDirty).toBe(false);
    act(() => {
      api().setTitle('Edited');
    });
    expect(api().status().isDirty).toBe(true);
  });

  test('auto-save is off unless asked for', () => {
    jest.useFakeTimers();
    const onSave = jest.fn();
    const api = mount({ onSave });
    act(() => {
      api().setTitle('Edited');
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  test('auto-save fires once after the debounce, then the diagram is clean', async () => {
    jest.useFakeTimers();
    const onSave = jest.fn();
    const api = mount({ onSave, autoSaveDebounce: 2000 });
    act(() => {
      api().setTitle('One');
    });
    // Separate act() calls: the edit must render (and re-arm the debounce)
    // before time moves on.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      api().setTitle('Two');
    });
    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0][0] as Model).title).toBe('Two');
    expect(api().status()).toMatchObject({ state: 'saved', isDirty: false });
  });

  test('a failed auto-save stops retrying until asked', async () => {
    jest.useFakeTimers();
    const onSave = jest.fn(() => {
      return Promise.reject(new Error('nope'));
    });
    const api = mount({ onSave, autoSaveDebounce: 500 });
    act(() => {
      api().setTitle('X');
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(api().status().state).toBe('error');
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('an edit made while saving leaves the diagram dirty', async () => {
    let resolve: () => void = () => {};
    const onSave = jest.fn(() => {
      return new Promise<void>((r) => {
        resolve = r;
      });
    });
    const api = mount({ onSave });
    act(() => {
      api().setTitle('Sent');
    });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = performSave(onSave, api().getModel(), {
        getStatus: api().ui.getSaveStatus,
        setStatus: api().ui.setSaveStatus
      });
    });
    act(() => {
      api().setTitle('Edited mid-save');
    });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(api().status()).toMatchObject({ state: 'saved', isDirty: true });
  });
});
