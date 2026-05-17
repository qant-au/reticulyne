/**
 * @jest-environment jsdom
 */
import { render, cleanup, act } from '@testing-library/react';
import { ModelProvider, useModelStore } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from '../useInitialDataManager';
import { INITIAL_DATA } from 'src/config';
import { model as fixtureModel } from 'src/fixtures/model';
import type { InitialData, Model } from 'src/types';
import type { ZodIssue } from 'zod';

type Slot = {
  load: ReturnType<typeof useInitialDataManager>['load'];
  clear: ReturnType<typeof useInitialDataManager>['clear'];
  isReady: boolean;
  getModel: () => Model;
  getView: () => string;
};

// Calling a callback prop during render is the cleanest way to expose
// the hook surface to the test without violating the React-Compiler-
// style immutability rules that forbid mutating parameter properties.
const HookProbe = ({
  onCapture,
  onValidationError
}: {
  onCapture: (s: Slot) => void;
  onValidationError?: (issues: ZodIssue[]) => void;
}) => {
  const { load, clear, isReady } = useInitialDataManager({ onValidationError });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const view = useUiStateStore((state) => {
    return state.view;
  });

  onCapture({
    load,
    clear,
    isReady,
    getModel: () => {
      return modelActions.get();
    },
    getView: () => {
      return view;
    }
  });

  return null;
};

const Harness = ({
  onCapture,
  onValidationError
}: {
  onCapture: (s: Slot) => void;
  onValidationError?: (issues: ZodIssue[]) => void;
}) => {
  return (
    <ModelProvider>
      <SceneProvider>
        <UiStateProvider>
          <HookProbe
            onCapture={onCapture}
            onValidationError={onValidationError}
          />
        </UiStateProvider>
      </SceneProvider>
    </ModelProvider>
  );
};

const renderHarness = (opts?: {
  onValidationError?: (issues: ZodIssue[]) => void;
}): { current: Slot } => {
  const ref: { current: Slot | null } = { current: null };
  act(() => {
    render(
      <Harness
        onValidationError={opts?.onValidationError}
        onCapture={(s) => {
          ref.current = s;
        }}
      />
    );
  });
  if (ref.current === null) {
    throw new Error('Harness did not capture the hook API.');
  }
  return ref as { current: Slot };
};

describe('useInitialDataManager', () => {
  let alertSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on alert so we can prove the legacy modal behaviour is gone;
    // spy on console.error so we can prove the new fallback path runs.
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {
      return undefined;
    });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    errorSpy.mockRestore();
    cleanup();
  });

  test('loads valid data into the model store and sets isReady', () => {
    const slot = renderHarness();
    expect(slot.current.isReady).toBe(false);

    act(() => {
      slot.current.load(fixtureModel as InitialData);
    });

    expect(slot.current.getModel().items).toEqual(fixtureModel.items);
    expect(slot.current.getModel().views).toEqual(fixtureModel.views);
    expect(slot.current.isReady).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('activates the first view by default', () => {
    const slot = renderHarness();

    act(() => {
      slot.current.load(fixtureModel as InitialData);
    });

    expect(slot.current.getView()).toBe(fixtureModel.views[0].id);
  });

  test('honours the `view` hint when present in initialData', () => {
    const slot = renderHarness();
    const twoViews: InitialData = {
      ...(fixtureModel as InitialData),
      views: [
        ...fixtureModel.views,
        {
          id: 'view2',
          name: 'View2',
          items: [],
          connectors: [],
          rectangles: [],
          textBoxes: []
        }
      ],
      view: 'view2'
    };

    act(() => {
      slot.current.load(twoViews);
    });

    expect(slot.current.getView()).toBe('view2');
  });

  test('rejects invalid data via the console.error fallback (no window.alert)', () => {
    const slot = renderHarness();
    const beforeTitle = slot.current.getModel().title;

    act(() => {
      slot.current.load({
        // Intentionally missing required fields (no `colors` / `icons` / `views` / `items`).
        title: 'broken'
      } as unknown as InitialData);
    });

    // The legacy window.alert path is gone — library code popping a
    // native modal in the consumer's page was the whole point of Q-2.
    expect(alertSpy).not.toHaveBeenCalled();
    // Fallback when no onValidationError is provided: surface the
    // failure in the console with a recognisable prefix.
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch(/\[isoflow\]/);
    expect(slot.current.isReady).toBe(false);
    // Model store should not have been touched on rejection.
    expect(slot.current.getModel().title).toBe(beforeTitle);
  });

  test('routes validation failures to onValidationError when supplied (no fallback to console.error)', () => {
    const onValidationError = jest.fn();
    const slot = renderHarness({ onValidationError });

    act(() => {
      slot.current.load({
        title: 'broken'
      } as unknown as InitialData);
    });

    expect(onValidationError).toHaveBeenCalledTimes(1);
    const issues = onValidationError.mock.calls[0][0];
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    // ZodIssue has at least a `code` and `path` we can lean on.
    expect(issues[0]).toEqual(
      expect.objectContaining({ code: expect.any(String) })
    );

    // The callback claimed the failure so the fallback shouldn't fire.
    expect(errorSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(slot.current.isReady).toBe(false);
  });

  test('a re-rendered onValidationError with fresh closure identity still receives the latest issues', () => {
    // Regression guard for the ref-stash pattern: load()'s useCallback
    // identity must stay stable even as the caller passes a fresh
    // onValidationError closure on every render, but the LATEST
    // closure must be the one that runs on rejection.
    const calls: ZodIssue[][] = [];
    const first = jest.fn();
    const second = jest.fn((issues: ZodIssue[]) => {
      calls.push(issues);
    });

    const ref: { current: Slot | null } = { current: null };
    let rerender: ((onErr: (issues: ZodIssue[]) => void) => void) | null = null;

    act(() => {
      const { rerender: rr } = render(
        <Harness
          onValidationError={first}
          onCapture={(s) => {
            ref.current = s;
          }}
        />
      );
      rerender = (onErr) => {
        rr(
          <Harness
            onValidationError={onErr}
            onCapture={(s) => {
              ref.current = s;
            }}
          />
        );
      };
    });

    // Swap to the second callback BEFORE triggering the failure.
    act(() => {
      rerender!(second);
    });

    act(() => {
      ref.current!.load({ title: 'broken' } as unknown as InitialData);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  test('auto-creates a view when initialData.views is empty', () => {
    const slot = renderHarness();
    const emptyViews: InitialData = {
      ...INITIAL_DATA,
      items: [],
      views: []
    };

    act(() => {
      slot.current.load(emptyViews);
    });

    expect(slot.current.getModel().views.length).toBe(1);
    expect(slot.current.getView()).toBe(slot.current.getModel().views[0].id);
    expect(slot.current.isReady).toBe(true);
  });

  test('skips re-processing when the same initialData reference is passed twice', () => {
    const slot = renderHarness();

    act(() => {
      slot.current.load(fixtureModel as InitialData);
    });
    const firstViewsRef = slot.current.getModel().views;

    act(() => {
      slot.current.load(fixtureModel as InitialData);
    });

    // No re-processing => model.views object identity is preserved.
    expect(slot.current.getModel().views).toBe(firstViewsRef);
  });

  test('clear() resets items / views while preserving icons + colors', () => {
    const slot = renderHarness();

    act(() => {
      slot.current.load(fixtureModel as InitialData);
    });

    const savedIcons = slot.current.getModel().icons;
    const savedColors = slot.current.getModel().colors;

    act(() => {
      slot.current.clear();
    });

    expect(slot.current.getModel().items).toEqual([]);
    // clear() loads INITIAL_DATA which has an empty views array;
    // the auto-create branch then creates exactly one fresh view.
    expect(slot.current.getModel().views.length).toBe(1);
    expect(slot.current.getModel().views[0].id).not.toBe(
      fixtureModel.views[0].id
    );
    expect(slot.current.getModel().icons).toEqual(savedIcons);
    expect(slot.current.getModel().colors).toEqual(savedColors);
  });
});
