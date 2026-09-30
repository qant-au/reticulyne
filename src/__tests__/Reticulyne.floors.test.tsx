/**
 * @jest-environment jsdom
 */
import { useEffect, useRef } from 'react';
import {
  render,
  cleanup,
  act,
  fireEvent,
  screen,
  within
} from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import type { InitialData } from 'src/types';

// lw-053: the floor switcher, cross-floor stubs, Alt + Up / Down, and the
// other floors drawn faintly.

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
});

const building: InitialData = {
  title: 'Head office',
  icons: [],
  colors: [],
  items: [
    { id: 'sw', name: 'Core switch' },
    { id: 'ap', name: 'AP east' }
  ],
  views: [
    {
      id: 'ground',
      name: 'Ground',
      items: [{ id: 'sw', tile: { x: 0, y: 0 } }]
    },
    { id: 'l1', name: 'Level 1', items: [{ id: 'ap', tile: { x: 2, y: 0 } }] }
  ],
  connections: [{ id: 'c1', from: 'sw', to: 'ap' }]
};

type Probe = { view: () => string; floors: () => string[] };

const ProbeInside = ({ onReady }: { onReady: (p: Probe) => void }) => {
  const view = useRef('');
  const floors = useRef<string[]>([]);
  const viewNow = useUiStateStore((state) => {
    return state.view;
  });
  const viewsNow = useModelStore((state) => {
    return state.views;
  });
  useEffect(() => {
    view.current = viewNow;
    floors.current = viewsNow.map((v) => {
      return v.id;
    });
  }, [viewNow, viewsNow]);
  useEffect(() => {
    onReady({
      view: () => {
        return view.current;
      },
      floors: () => {
        return floors.current;
      }
    });
  }, [onReady]);
  return null;
};

const mount = (
  props: Partial<Parameters<typeof Reticulyne>[0]> = {},
  initialData: InitialData = building
): Probe => {
  let probe: Probe | null = null;
  act(() => {
    render(
      <Reticulyne initialData={initialData} {...props}>
        <ProbeInside
          onReady={(p) => {
            probe = p;
          }}
        />
      </Reticulyne>
    );
  });
  if (!probe) throw new Error('probe did not mount');
  return probe;
};

const key = (init: KeyboardEventInit) => {
  act(() => {
    fireEvent.keyDown(window, init);
  });
};

describe('floor switcher', () => {
  test('lists the floors lowest first and switches on click', () => {
    const probe = mount();
    const tabs = within(screen.getByTestId('floor-switcher')).getAllByRole(
      'tab'
    );
    expect(
      tabs.map((t) => {
        return t.textContent;
      })
    ).toEqual(['Ground', 'Level 1']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    act(() => {
      fireEvent.click(screen.getByTestId('floor-tab-l1'));
    });
    expect(probe.view()).toBe('l1');
  });

  test('Alt + Up / Down step through the floors, stopping at the ends', () => {
    const probe = mount({ editorMode: 'EXPLORABLE_READONLY' });
    key({ key: 'ArrowUp', code: 'ArrowUp', altKey: true });
    expect(probe.view()).toBe('l1');
    key({ key: 'ArrowUp', code: 'ArrowUp', altKey: true });
    expect(probe.view()).toBe('l1');
    key({ key: 'ArrowDown', code: 'ArrowDown', altKey: true });
    expect(probe.view()).toBe('ground');
  });

  test('a read-only diagram with one view shows just its name', () => {
    mount(
      { editorMode: 'EXPLORABLE_READONLY' },
      { ...building, views: [building.views[0]], connections: [] }
    );
    expect(screen.queryByTestId('floor-switcher')).toBeNull();
    expect(screen.getByText('Ground')).toBeTruthy();
  });

  test('adding a floor shows it; undo takes it away without breaking', () => {
    const probe = mount();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Add a floor' }));
    });
    expect(probe.floors()).toHaveLength(3);
    const added = probe.floors()[2];
    expect(probe.view()).toBe(added);
    expect(screen.getByTestId(`floor-tab-${added}`).textContent).toBe(
      'Floor 3'
    );

    key({ key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(probe.floors()).toEqual(['ground', 'l1']);
    expect(probe.view()).toBe('ground');
  });

  test('deleting the floor on show moves to the one below', () => {
    const probe = mount();
    act(() => {
      fireEvent.click(screen.getByTestId('floor-tab-l1'));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Floor options' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete floor' }));
    });
    expect(probe.floors()).toEqual(['ground']);
    expect(probe.view()).toBe('ground');
  });

  test('moving a floor up reorders the tabs', () => {
    const probe = mount();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Floor options' }));
    });
    act(() => {
      fireEvent.click(
        screen.getByRole('menuitem', { name: 'Move up a floor' })
      );
    });
    expect(probe.floors()).toEqual(['l1', 'ground']);
  });

  test('a read-only diagram cannot add, rename or delete floors', () => {
    mount({ editorMode: 'EXPLORABLE_READONLY' });
    expect(screen.getByTestId('floor-switcher')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add a floor' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Floor options' })).toBeNull();
  });
});

describe('cross-floor stubs', () => {
  test('each floor shows a stub naming the other; clicking it goes there', () => {
    const probe = mount();
    const stub = screen.getByRole('button', {
      name: 'Go to Level 1 · AP east'
    });
    act(() => {
      fireEvent.click(stub);
    });
    expect(probe.view()).toBe('l1');
    expect(
      screen.getByRole('button', { name: 'Go to Ground · Core switch' })
    ).toBeTruthy();
  });

  test('an export render draws the stub but it cannot be clicked', () => {
    mount({ editorMode: 'NON_INTERACTIVE' });
    expect(screen.getByTestId('floor-stub-c1-sw')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Go to/ })).toBeNull();
  });
});

describe('other floors', () => {
  test('drawn faintly by default, and the toggle hides them', () => {
    mount();
    expect(screen.getByTestId('other-floor-l1')).toBeTruthy();
    act(() => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Show other floors' })
      );
    });
    expect(screen.queryByTestId('other-floor-l1')).toBeNull();
  });

  test('never in an export render', () => {
    mount({ editorMode: 'NON_INTERACTIVE' });
    expect(screen.queryByTestId('other-floor-l1')).toBeNull();
  });
});
