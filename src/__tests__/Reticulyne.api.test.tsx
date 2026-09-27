/**
 * @jest-environment jsdom
 */
import { useEffect, useRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { model as fixtureModel } from 'src/fixtures/model';
import type { InitialData } from 'src/types';

// FEA-06: useReticulyne().setView. DOC-03: the patterns docs/embedding.md
// recommends for loading a model from the host, and the one it used to
// recommend, which never worked.

beforeAll(() => {
  // ExpandableLabel scrolls on mount; jsdom has no Element.scrollTo.
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
});

const twoViewModel: InitialData = {
  ...fixtureModel,
  views: [...fixtureModel.views, { id: 'view2', name: 'Floor 2', items: [] }]
};

type Api = ReturnType<typeof useReticulyne> & {
  currentView: () => string;
  selectionSize: () => number;
  selectFirstItem: () => void;
};

const Probe = ({ onReady }: { onReady: (api: Api) => void }) => {
  const api = useReticulyne();
  const ui = useUiStateStore((state) => {
    return state.actions;
  });
  // Latest values, read at assertion time rather than captured at mount.
  const view = useRef('');
  const selectionSize = useRef(0);
  const viewNow = useUiStateStore((state) => {
    return state.view;
  });
  const selectionNow = useUiStateStore((state) => {
    return state.selection.length;
  });
  useEffect(() => {
    view.current = viewNow;
    selectionSize.current = selectionNow;
  }, [viewNow, selectionNow]);
  useEffect(() => {
    onReady({
      ...api,
      currentView: () => {
        return view.current;
      },
      selectionSize: () => {
        return selectionSize.current;
      },
      selectFirstItem: () => {
        ui.setItemControls({ type: 'ITEM', id: fixtureModel.items[0].id });
      }
    });
  }, [api, ui, onReady]);
  return null;
};

const mount = (
  props: Partial<Parameters<typeof Reticulyne>[0]> = {}
): (() => Api) => {
  let captured: Api | null = null;
  act(() => {
    render(
      <Reticulyne initialData={twoViewModel} {...props}>
        <Probe
          onReady={(api) => {
            captured = api;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    if (!captured) throw new Error('probe did not mount');
    return captured;
  };
};

describe('useReticulyne().setView (FEA-06)', () => {
  test('switches the view in a read-only editor and clears the selection', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    expect(api().currentView()).toBe('view1');
    act(() => {
      api().selectFirstItem();
    });
    expect(api().selectionSize()).toBe(1);

    act(() => {
      api().setView('view2');
    });

    expect(api().currentView()).toBe('view2');
    expect(api().selectionSize()).toBe(0);
  });

  test('warns and stays put on an unknown view id', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const api = mount();

    act(() => {
      api().setView('no-such-view');
    });

    expect(api().currentView()).toBe('view1');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no view with id "no-such-view"')
    );
    warn.mockRestore();
  });
});

describe('loading a model from the host (DOC-03)', () => {
  const replacement: InitialData = { ...twoViewModel, title: 'Replacement' };

  test('the old example is refused: setEditorMode then loadModel in one tick', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });

    act(() => {
      api().setEditorMode('EDITABLE');
      api().loadModel(replacement);
      api().setEditorMode('EXPLORABLE_READONLY');
    });

    expect(api().getModel().title).toBe(twoViewModel.title);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Refusing loadModel')
    );
    warn.mockRestore();
  });

  test('read-only viewer: a new initialData prop re-hydrates', () => {
    let captured: Api | null = null;
    const onReady = (api: Api) => {
      captured = api;
    };
    let rerender: ReturnType<typeof render>['rerender'] = () => {};
    act(() => {
      ({ rerender } = render(
        <Reticulyne editorMode="EXPLORABLE_READONLY" initialData={twoViewModel}>
          <Probe onReady={onReady} />
        </Reticulyne>
      ));
    });

    act(() => {
      rerender(
        <Reticulyne editorMode="EXPLORABLE_READONLY" initialData={replacement}>
          <Probe onReady={onReady} />
        </Reticulyne>
      );
    });

    expect(captured!.getModel().title).toBe('Replacement');
  });

  test('editable editor: loadModel replaces the contents', () => {
    const api = mount({ editorMode: 'EDITABLE' });

    act(() => {
      api().loadModel(replacement);
    });

    expect(api().getModel().title).toBe('Replacement');
  });
});

describe('diagram title (1.2)', () => {
  test('getTitle reads it; setTitle renames an editable diagram', () => {
    const api = mount({ editorMode: 'EDITABLE' });
    expect(api().getTitle()).toBe(twoViewModel.title);

    act(() => {
      api().setTitle('  Network plan  ');
    });

    expect(api().getTitle()).toBe('Network plan');
    expect(api().getModel().title).toBe('Network plan');
  });

  test('a blank title becomes Untitled', () => {
    const api = mount({ editorMode: 'EDITABLE' });
    act(() => {
      api().setTitle('   ');
    });
    expect(api().getTitle()).toBe('Untitled');
  });

  test('refused in a read-only editor', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().setTitle('Nope');
    });
    expect(api().getTitle()).toBe(twoViewModel.title);
    warn.mockRestore();
  });

  test('over 100 characters is refused through onValidationError', () => {
    const onValidationError = jest.fn();
    const api = mount({ editorMode: 'EDITABLE', onValidationError });
    act(() => {
      api().setTitle('x'.repeat(101));
    });
    expect(api().getTitle()).toBe(twoViewModel.title);
    expect(onValidationError).toHaveBeenCalled();
  });

  test('loadModel without a title gives Untitled', () => {
    const api = mount({ editorMode: 'EDITABLE' });
    const untitled: InitialData = { ...twoViewModel };
    delete untitled.title;
    act(() => {
      api().loadModel(untitled);
    });
    expect(api().getTitle()).toBe('Untitled');
  });
});
