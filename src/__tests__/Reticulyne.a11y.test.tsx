/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import {
  render,
  cleanup,
  act,
  fireEvent,
  screen
} from '@testing-library/react';
import Reticulyne from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import type { InitialData, UiStateStore, View } from 'src/types';

// lw-068: keyboard navigation and screen-reader support.

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  // Text boxes measure their content with a canvas 2D context, which
  // jsdom does not implement. Stub just enough of it for `getTextWidth`.
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      font: '',
      measureText: () => {
        return { width: 10 };
      }
    };
  }) as unknown as HTMLCanvasElement['getContext'];
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

const diagram: InitialData = {
  title: 'Network',
  icons: [],
  colors: [],
  items: [
    { id: 'a', name: 'Router', description: '<p>Edge</p>' },
    { id: 'b', name: 'Switch' }
  ],
  views: [
    {
      id: 'v',
      name: 'V',
      items: [
        { id: 'a', tile: { x: 0, y: 0 } },
        { id: 'b', tile: { x: 3, y: 0 } }
      ],
      connectors: [
        {
          id: 'ab',
          anchors: [
            { id: 'x', ref: { item: 'a' } },
            { id: 'y', ref: { item: 'b' } }
          ]
        }
      ]
    }
  ]
};

const latest: { ui: UiStateStore | null; view: View | null } = {
  ui: null,
  view: null
};
const ui = () => {
  return latest.ui!;
};
const view = () => {
  return latest.view!;
};

const Probe = () => {
  const uiState = useUiStateStore((state) => {
    return state;
  });
  const views = useModelStore((state) => {
    return state.views;
  });
  useEffect(() => {
    latest.ui = uiState;
    latest.view = views[0];
  }, [uiState, views]);
  return null;
};

const mount = (props: Partial<Parameters<typeof Reticulyne>[0]> = {}) => {
  act(() => {
    render(
      <Reticulyne initialData={diagram} {...props}>
        <Probe />
      </Reticulyne>
    );
  });
  return screen.getByRole('application');
};

/** Fire a key on `target`; true when nothing prevented its default. */
const press = (target: Element, init: KeyboardEventInit) => {
  let notPrevented = true;
  act(() => {
    notPrevented = fireEvent.keyDown(target, init);
  });
  return notPrevented;
};

const tab = (target: Element, shiftKey = false) => {
  return press(target, { key: 'Tab', code: 'Tab', shiftKey });
};

const selected = () => {
  return ui().selection.map((ref) => {
    return `${ref.type}:${ref.id}`;
  });
};

describe('keyboard access', () => {
  test('the canvas is focusable in the default global mode, and says how to use it', () => {
    const canvas = mount();
    expect(canvas.getAttribute('tabindex')).toBe('0');
    const hint = document.getElementById(
      canvas.getAttribute('aria-describedby')!
    );
    expect(hint?.textContent).toMatch(
      /Tab and Shift\+Tab move between objects/
    );
  });

  test('Tab walks every object, then lets focus leave the canvas', () => {
    const canvas = mount();
    const seen: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      expect(tab(canvas)).toBe(false);
      seen.push(...selected());
    }
    expect(new Set(seen)).toEqual(
      new Set(['ITEM:a', 'ITEM:b', 'CONNECTOR:ab'])
    );
    expect(seen[2]).toBe('CONNECTOR:ab');
    // Past the last object: the selection clears and Tab is not taken.
    expect(tab(canvas)).toBe(true);
    expect(selected()).toEqual([]);
  });

  test('Shift+Tab walks back from the end', () => {
    const canvas = mount();
    tab(canvas, true);
    expect(selected()).toEqual(['CONNECTOR:ab']);
  });

  test('Tab from outside the canvas is left to the page', () => {
    mount();
    expect(tab(document.body)).toBe(true);
    expect(selected()).toEqual([]);
  });

  test('Tab from a control inside the canvas is left to the browser', () => {
    const canvas = mount({ editorMode: 'EXPLORABLE_READONLY' });
    // As a node label's Show more button: inside the canvas, but not it.
    const button = document.createElement('button');
    canvas.appendChild(button);
    expect(tab(button)).toBe(true);
    expect(tab(button, true)).toBe(true);
    expect(selected()).toEqual([]);
  });

  test('Tab works read-only too', () => {
    const canvas = mount({ editorMode: 'EXPLORABLE_READONLY' });
    tab(canvas);
    expect(selected()).toHaveLength(1);
  });

  test('Ctrl + arrow pans the view', () => {
    const canvas = mount({ editorMode: 'EXPLORABLE_READONLY' });
    const before = ui().scroll.position;
    press(canvas, { key: 'ArrowLeft', code: 'ArrowLeft', ctrlKey: true });
    expect(ui().scroll.position.x).toBeGreaterThan(before.x);
    expect(ui().scroll.position.y).toBe(before.y);
  });

  test('Shift+F10 opens the selected object menu, with Connect to for a node', () => {
    const canvas = mount();
    tab(canvas);
    press(canvas, { key: 'F10', code: 'F10', shiftKey: true });
    expect(ui().contextMenu?.item).toEqual(ui().selection[0]);
    expect(screen.queryByText('Connect to…')).not.toBeNull();
  });

  test('Enter with the rectangle tool draws one in the middle of the view', () => {
    const canvas = mount();
    press(canvas, { key: 'r', code: 'KeyR' });
    press(canvas, { key: 'Enter', code: 'Enter' });
    expect(view().rectangles).toHaveLength(1);
    expect(ui().selection[0].type).toBe('RECTANGLE');
    expect(ui().mode.type).toBe('CURSOR');
  });

  test('Enter on a text box reached with Tab puts focus in its text', () => {
    const canvas = mount({
      initialData: {
        ...diagram,
        views: [
          {
            ...diagram.views[0],
            textBoxes: [{ id: 't', content: 'Label', tile: { x: 0, y: 3 } }]
          }
        ]
      }
    });
    while (selected()[0] !== 'TEXTBOX:t') tab(canvas);
    // As in the browser: the panel is already open from the selection and
    // the canvas has focus, so neither autoFocus on mount nor MUI's
    // focus-when-nothing-is-focused can pass this.
    act(() => {
      ui().actions.setItemControls({ type: 'TEXTBOX', id: 't' });
      canvas.focus();
    });
    press(canvas, { key: 'Enter', code: 'Enter' });
    const field = screen.getByRole('textbox', {
      name: 'Text'
    }) as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe('Label'.length);
    expect(ui().focusTextBoxId).toBeNull();
  });

  test('the connector tool with a node selected: Enter asks what to connect it to', () => {
    const canvas = mount();
    act(() => {
      ui().actions.setSelection([{ type: 'ITEM', id: 'a' }]);
    });
    press(canvas, { key: 'a', code: 'KeyA' });
    press(canvas, { key: 'Enter', code: 'Enter' });
    expect(ui().dialog).toBe('CONNECT_TO');
  });
});

test('an icon picked from the keyboard goes straight onto a free tile', () => {
  act(() => {
    render(
      <Reticulyne
        initialData={{
          ...diagram,
          icons: [{ id: 'box', name: 'Box', url: '/box.svg' }]
        }}
      >
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui().actions.setIconPaletteOpen(true);
  });
  // The collections start folded; a search lists the icon directly.
  const search = screen
    .getByTestId('icon-palette')
    .querySelector('input') as HTMLInputElement;
  act(() => {
    fireEvent.change(search, { target: { value: 'Box' } });
  });
  const icon = screen.getByAltText('Icon Box').closest('button')!;
  // Enter on a button clicks it, with no press before: the keyboard path.
  act(() => {
    fireEvent.click(icon);
  });
  const added = view().items.find((item) => {
    return !['a', 'b'].includes(item.id);
  });
  expect(added).toBeDefined();
  expect(['0,0', '3,0']).not.toContain(`${added!.tile.x},${added!.tile.y}`);
  expect(ui().selection).toEqual([{ type: 'ITEM', id: added!.id }]);
  // Focus goes to the canvas, where the announced arrow keys and Enter
  // work, not to the page as the icon panel closes.
  expect(document.activeElement).toBe(screen.getByRole('application'));
});

test('a pointer press still only arms the icon, for a click on the canvas', () => {
  act(() => {
    render(
      <Reticulyne
        initialData={{
          ...diagram,
          icons: [{ id: 'box', name: 'Box', url: '/box.svg' }]
        }}
      >
        <Probe />
      </Reticulyne>
    );
  });
  act(() => {
    ui().actions.setIconPaletteOpen(true);
  });
  // The collections start folded; a search lists the icon directly.
  const search = screen
    .getByTestId('icon-palette')
    .querySelector('input') as HTMLInputElement;
  act(() => {
    fireEvent.change(search, { target: { value: 'Box' } });
  });
  const icon = screen.getByAltText('Icon Box').closest('button')!;
  act(() => {
    fireEvent.mouseDown(icon);
    fireEvent.click(icon);
  });
  expect(view().items).toHaveLength(2);
  expect(ui().mode).toMatchObject({ type: 'PLACE_ICON', id: 'box' });
});

describe('screen-reader support', () => {
  test('a selection is read out through the live region', () => {
    const canvas = mount();
    tab(canvas);
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/of 3/);
    expect(status.textContent).toMatch(/Router|Switch/);
  });

  test('the outline lists each item with its description and links', () => {
    mount({ editorMode: 'EXPLORABLE_READONLY' });
    const outline = screen.getByTestId('diagram-outline');
    expect(outline.textContent).toMatch('2 items, 1 connector');
    expect(outline.textContent).toMatch('Router. Edge. Connected to Switch.');
    expect(outline.textContent).toMatch('Switch. Connected to Router.');
  });
});
