/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reticulyne from '../Reticulyne';
import type { Model } from 'src/types';

// jsdom shims — copied from Reticulyne.smoke.test.tsx since the renderer
// touches ResizeObserver and matchMedia on mount.
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

const openMainMenu = async () => {
  const trigger = screen.getByRole('button', { name: /main menu/i });
  await act(async () => {
    await userEvent.click(trigger);
  });
};

describe('FEA5-03 — onSave + ACTION.SAVE main-menu entry', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('renders the Save menu entry and fires onSave with the current model when clicked', async () => {
    const onSave = jest.fn();
    render(
      <Reticulyne
        mainMenuOptions={['ACTION.SAVE']}
        onSave={onSave}
        initialData={{
          version: '',
          title: 'SaveTarget',
          icons: [],
          colors: [{ id: 'c1', value: '#fff' }],
          items: [],
          views: [{ id: 'v1', name: 'V1', items: [] }]
        }}
      />
    );

    await openMainMenu();

    const saveEntry = screen.getByText('Save');
    expect(saveEntry).toBeDefined();

    await act(async () => {
      fireEvent.click(saveEntry);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0] as Model;
    expect(arg.title).toBe('SaveTarget');
    expect(arg.views).toHaveLength(1);
  });

  test('suppresses the Save entry when ACTION.SAVE is in mainMenuOptions but onSave is missing', async () => {
    render(<Reticulyne mainMenuOptions={['ACTION.SAVE']} />);

    await openMainMenu();

    expect(screen.queryByText('Save')).toBeNull();

    // The MainMenu component fires a one-shot diagnostic warning when
    // SAVE is listed without a callback — helps the host notice the
    // misconfiguration without breaking the UI.
    expect(warnSpy).toHaveBeenCalled();
    const matched = warnSpy.mock.calls.find((call) => {
      return /\[isoflow\].*ACTION\.SAVE.*onSave/i.test(String(call[0]));
    });
    expect(matched).toBeDefined();
  });

  test('suppresses the Save entry when onSave is supplied but ACTION.SAVE is not in mainMenuOptions', async () => {
    const onSave = jest.fn();
    render(<Reticulyne mainMenuOptions={['EXPORT.JSON']} onSave={onSave} />);

    await openMainMenu();

    expect(screen.queryByText('Save')).toBeNull();
    // EXPORT.JSON should still render to prove the menu itself opened.
    expect(screen.queryByText('Export as JSON')).not.toBeNull();
    // Host wired onSave but didn't opt the entry in — no warning here,
    // this is a legitimate "callback ready for a future menu config".
    const matched = warnSpy.mock.calls.find((call) => {
      return /ACTION\.SAVE.*onSave/i.test(String(call[0]));
    });
    expect(matched).toBeUndefined();
  });
});
