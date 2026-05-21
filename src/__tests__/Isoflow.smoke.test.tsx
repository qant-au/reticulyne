/**
 * @jest-environment jsdom
 */
import { render, screen, cleanup, act } from '@testing-library/react';
import Isoflow from '../Isoflow';
import type { InitialData, Model } from 'src/types';

// jsdom does not implement ResizeObserver or matchMedia; the renderer
// touches both. Provide minimal shims so the component can mount.
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

describe('Isoflow smoke', () => {
  test('mounts with no props and produces a non-empty render', () => {
    const { container } = render(<Isoflow />);
    expect(container.firstChild).not.toBeNull();
  });

  test('mounts with editorMode="EXPLORABLE_READONLY"', () => {
    const { container } = render(<Isoflow editorMode="EXPLORABLE_READONLY" />);
    expect(container.firstChild).not.toBeNull();
  });

  test('mounts with editorMode="NON_INTERACTIVE"', () => {
    const { container } = render(<Isoflow editorMode="NON_INTERACTIVE" />);
    expect(container.firstChild).not.toBeNull();
  });

  test('mounts with custom width and height', () => {
    const { container } = render(<Isoflow width={640} height={480} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('resilience to sparse model input (BUG5-04)', () => {
  // The library accepts unbounded zod input (colors has no .min() in its
  // schema). Before BUG5-04, useColor threw when the palette was empty,
  // surfacing through IsoflowErrorBoundary and replacing the editor
  // with the failure UI. Dangling icon refs (only reachable via the
  // imperative Model.set escape hatch which bypasses cross-ref
  // validation) had the same shape of problem in useIcon — both hooks
  // now fall back to the built-in DEFAULT_COLOR / DEFAULT_ICON instead
  // of throwing. See src/hooks/__tests__/useIcon.test.tsx for the
  // dangling-icon path tested directly against the hook.

  test('mounts with colors: [] without crashing the editor', () => {
    const onError = jest.fn();
    const { container } = render(
      <Isoflow
        onError={onError}
        initialData={{
          version: '',
          title: 'EmptyPalette',
          icons: [],
          colors: [],
          items: [],
          views: [
            {
              id: 'view-1',
              name: 'View 1',
              items: [],
              connectors: [
                {
                  id: 'c-1',
                  anchors: [
                    { id: 'a-1', ref: { tile: { x: 0, y: 0 } } },
                    { id: 'a-2', ref: { tile: { x: 1, y: 0 } } }
                  ]
                }
              ]
            }
          ]
        }}
      />
    );
    expect(onError).not.toHaveBeenCalled();
    expect(container.firstChild).not.toBeNull();
  });
});

describe('initialData reference stability (BUG5-11)', () => {
  // Regression: the load-effect inside App spread
  // `{ ...INITIAL_DATA, ...initialData }` inline on every effect run,
  // producing a fresh object reference and silently defeating the
  // reference-equality dedupe in useInitialDataManager.load. Any host
  // that re-rendered Isoflow (e.g. because it bridges onModelUpdated
  // into React state to track a `dirty` flag) re-seeded the entire
  // model store on every parent render, wiping unsaved items.
  //
  // The fix memoises the merge so the merged ref is stable while the
  // consumer's `initialData` ref is stable, restoring the dedupe.
  test('parent re-render with same initialData ref does not re-seed the model', () => {
    const onModelUpdated = jest.fn();

    // Stable reference, intentionally with views: [] so the load
    // pipeline takes the auto-create-view branch (generateId()). If the
    // model is re-seeded between renders, a fresh view id would emerge
    // on the second pass.
    const initialData: InitialData = {
      version: '',
      title: 'StableRef',
      icons: [],
      colors: [{ id: 'c1', value: '#fff' }],
      items: [],
      views: []
    };

    const { rerender } = render(
      <Isoflow initialData={initialData} onModelUpdated={onModelUpdated} />
    );

    // After initial seed the callback has fired at least once and the
    // model has a synthesised view.
    expect(onModelUpdated).toHaveBeenCalled();
    const initialModel = onModelUpdated.mock.calls.at(-1)?.[0] as Model;
    expect(initialModel.views).toHaveLength(1);
    const firstViewId = initialModel.views[0].id;

    const callsBeforeRerender = onModelUpdated.mock.calls.length;

    // Force a parent re-render with the SAME initialData reference but
    // a different unrelated prop. With the bug, this triggers a fresh
    // `{ ...INITIAL_DATA, ...initialData }` inside the load-effect,
    // load() is not deduped, model is re-seeded, the auto-create-view
    // branch runs again with a fresh generateId(), and onModelUpdated
    // fires again with a different view id.
    act(() => {
      rerender(
        <Isoflow
          initialData={initialData}
          onModelUpdated={onModelUpdated}
          width={640}
        />
      );
    });

    // No extra model-update calls because load() short-circuited at
    // the dedupe guard.
    expect(onModelUpdated.mock.calls.length).toBe(callsBeforeRerender);

    // And if the callback did fire again for some other reason, the
    // view id must be the original one (model wasn't re-seeded).
    const lastModel = onModelUpdated.mock.calls.at(-1)?.[0] as Model;
    expect(lastModel.views[0].id).toBe(firstViewId);
  });
});

describe('showTitleBar prop', () => {
  test('showTitleBar=true forces title bar visible even in NON_INTERACTIVE mode', () => {
    render(<Isoflow editorMode="NON_INTERACTIVE" showTitleBar={true} />);
    expect(screen.queryByText('Untitled')).not.toBeNull();
  });

  test('showTitleBar=false forces title bar hidden even in EDITABLE mode', () => {
    render(<Isoflow editorMode="EDITABLE" showTitleBar={false} />);
    expect(screen.queryByText('Untitled')).toBeNull();
  });

  test('showTitleBar=undefined defers to editorMode (EXPLORABLE_READONLY shows title)', () => {
    render(<Isoflow editorMode="EXPLORABLE_READONLY" />);
    expect(screen.queryByText('Untitled')).not.toBeNull();
  });
});
