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
const HookProbe = ({ onCapture }: { onCapture: (s: Slot) => void }) => {
  const { load, clear, isReady } = useInitialDataManager();
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

const Harness = ({ onCapture }: { onCapture: (s: Slot) => void }) => {
  return (
    <ModelProvider>
      <SceneProvider>
        <UiStateProvider>
          <HookProbe onCapture={onCapture} />
        </UiStateProvider>
      </SceneProvider>
    </ModelProvider>
  );
};

const renderHarness = (): { current: Slot } => {
  const ref: { current: Slot | null } = { current: null };
  act(() => {
    render(
      <Harness
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
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {
      return undefined;
    });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    logSpy.mockRestore();
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

  test('rejects invalid data and alerts the user', () => {
    const slot = renderHarness();
    const beforeTitle = slot.current.getModel().title;

    act(() => {
      slot.current.load({
        // Intentionally missing required fields (no `colors` / `icons` / `views` / `items`).
        title: 'broken'
      } as unknown as InitialData);
    });

    expect(alertSpy).toHaveBeenCalledWith('There is an error in your model.');
    expect(slot.current.isReady).toBe(false);
    // Model store should not have been touched on rejection.
    expect(slot.current.getModel().title).toBe(beforeTitle);
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
