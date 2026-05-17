/**
 * @jest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react';
import Isoflow from '../Isoflow';

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
