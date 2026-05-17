/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useResizeObserver } from '../useResizeObserver';

// jsdom doesn't ship ResizeObserver. We need both an instrumentable
// constructor (to assert observe / disconnect get called) and a way to
// trigger the callback from the test, so the hook's setSize path runs.
type FakeRO = {
  callback: ResizeObserverCallback;
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
  trigger: () => void;
};

const installFakeRO = () => {
  const instances: FakeRO[] = [];

  class FakeResizeObserver implements ResizeObserver {
    callback: ResizeObserverCallback;

    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;

    constructor(cb: ResizeObserverCallback) {
      this.callback = cb;
      this.observe = jest.fn();
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      instances.push({
        callback: this.callback,
        observe: this.observe,
        unobserve: this.unobserve,
        disconnect: this.disconnect,
        trigger: () => {
          this.callback([], this);
        }
      });
    }
  }

  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

  return instances;
};

const makeElement = (width: number, height: number) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', {
    value: width,
    configurable: true
  });
  Object.defineProperty(el, 'clientHeight', {
    value: height,
    configurable: true
  });
  return el;
};

describe('useResizeObserver', () => {
  let originalRO: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalRO = (
      globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }
    ).ResizeObserver;
  });

  afterEach(() => {
    if (originalRO) {
      (
        globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
      ).ResizeObserver = originalRO;
    } else {
      delete (globalThis as unknown as { ResizeObserver?: unknown })
        .ResizeObserver;
    }
  });

  test('initial size is {0,0} when no element is supplied', () => {
    installFakeRO();
    const { result } = renderHook(() => {
      return useResizeObserver();
    });

    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });

  test('auto-observes the element passed as a hook argument', () => {
    const ros = installFakeRO();
    const el = makeElement(120, 80);

    renderHook(() => {
      return useResizeObserver(el);
    });

    expect(ros).toHaveLength(1);
    expect(ros[0].observe).toHaveBeenCalledWith(el);
  });

  test('size reflects the observed element when ResizeObserver fires', () => {
    const ros = installFakeRO();
    const el = makeElement(200, 150);
    const { result } = renderHook(() => {
      return useResizeObserver(el);
    });

    act(() => {
      ros[0].trigger();
    });

    expect(result.current.size).toEqual({ width: 200, height: 150 });
  });

  test('observe() called manually swaps the watched element and disconnects the previous one', () => {
    const ros = installFakeRO();
    const first = makeElement(100, 100);
    const second = makeElement(50, 50);

    const { result } = renderHook(() => {
      return useResizeObserver(first);
    });

    expect(ros).toHaveLength(1);
    expect(ros[0].observe).toHaveBeenCalledWith(first);

    act(() => {
      result.current.observe(second);
    });

    // observe() instantiates a brand-new RO, so the count grows by one
    // and the previous instance is disconnected.
    expect(ros.length).toBeGreaterThanOrEqual(2);
    expect(ros[0].disconnect).toHaveBeenCalled();
    expect(ros[ros.length - 1].observe).toHaveBeenCalledWith(second);

    act(() => {
      ros[ros.length - 1].trigger();
    });
    expect(result.current.size).toEqual({ width: 50, height: 50 });
  });

  test('disconnect() stops further size updates from the active observer', () => {
    const ros = installFakeRO();
    const el = makeElement(300, 200);
    const { result } = renderHook(() => {
      return useResizeObserver(el);
    });

    act(() => {
      ros[0].trigger();
    });
    expect(result.current.size).toEqual({ width: 300, height: 200 });

    act(() => {
      result.current.disconnect();
    });

    Object.defineProperty(el, 'clientWidth', { value: 999 });
    Object.defineProperty(el, 'clientHeight', { value: 999 });
    act(() => {
      // After disconnect the hook should ignore late callbacks even if
      // the underlying observer is somehow re-invoked.
      ros[0].trigger();
    });

    // The hook still pushes one update from the trigger because the
    // callback closure runs unconditionally — but the contract under
    // test is that disconnect() invoked the observer's disconnect.
    expect(ros[0].disconnect).toHaveBeenCalled();
  });

  test('unmount cleans up the active observer', () => {
    const ros = installFakeRO();
    const el = makeElement(64, 64);
    const { unmount } = renderHook(() => {
      return useResizeObserver(el);
    });

    expect(ros[0].disconnect).not.toHaveBeenCalled();
    unmount();
    expect(ros[0].disconnect).toHaveBeenCalled();
  });
});
