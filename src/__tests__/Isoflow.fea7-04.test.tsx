/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import Isoflow from '../Isoflow';
import { createIsoflowTheme } from 'src/styles/theme';
import type { InitialData } from 'src/types';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
});

// FEA7-04 needs the test to control window.matchMedia so the 'auto'
// branch is observable. Each test re-installs the stub with its own
// `matches` value before render.
const installMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      return {
        matches,
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
};

afterEach(() => {
  cleanup();
});

const emptyInitialData: InitialData = {
  version: '',
  title: 'FEA7-04 fixture',
  icons: [],
  colors: [],
  items: [],
  views: [{ id: 'view-1', name: 'View 1', items: [] }]
};

describe('FEA7-04 theme factory', () => {
  test('createIsoflowTheme(light) yields palette.mode = "light"', () => {
    const theme = createIsoflowTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.customVars.customPalette.diagramBg).toBe('#f6faff');
  });

  test('createIsoflowTheme(dark) yields palette.mode = "dark" with dark customVars', () => {
    const theme = createIsoflowTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.customVars.customPalette.diagramBg).toBe('#1a1d24');
    // The default node colour shifts to a darker blue so dark-mode
    // users get a colour that reads on the dark canvas.
    expect(theme.customVars.customPalette.defaultColor).toBe('#5b6ab1');
  });

  test('factory returns a stable shape across modes (typography, components)', () => {
    const light = createIsoflowTheme('light');
    const dark = createIsoflowTheme('dark');
    // The fields that should be mode-invariant
    expect(light.customVars.appPadding).toEqual(dark.customVars.appPadding);
    expect(light.customVars.toolMenu).toEqual(dark.customVars.toolMenu);
  });
});

describe('FEA7-04 themeMode prop', () => {
  test('default (no themeMode) renders without error in light mode', () => {
    installMatchMedia(false);
    const onError = jest.fn();
    render(<Isoflow onError={onError} initialData={emptyInitialData} />);
    expect(onError).not.toHaveBeenCalled();
  });

  test('themeMode="dark" renders without error', () => {
    installMatchMedia(false);
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={emptyInitialData}
        themeMode="dark"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('themeMode="auto" with prefers-color-scheme: dark renders without error', () => {
    installMatchMedia(true);
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={emptyInitialData}
        themeMode="auto"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('themeMode="auto" with prefers-color-scheme: light renders without error', () => {
    installMatchMedia(false);
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={emptyInitialData}
        themeMode="auto"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test('exportTheme="dark" renders without error', () => {
    installMatchMedia(false);
    const onError = jest.fn();
    render(
      <Isoflow
        onError={onError}
        initialData={emptyInitialData}
        themeMode="dark"
        exportTheme="dark"
      />
    );
    expect(onError).not.toHaveBeenCalled();
  });
});
