/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import Reticulyne from 'src/Reticulyne';
import { useImportFile } from '../useImportFile';
import type { InitialData } from 'src/types';

// Main menu > Open: a file that parses but is not a diagram reaches the
// host's onValidationError, as a file that does not parse already did.

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
  jest.restoreAllMocks();
});

const diagram: InitialData = {
  title: 'Network',
  icons: [],
  colors: [],
  items: [{ id: 'a', name: 'Router' }],
  views: [{ id: 'v', name: 'V', items: [{ id: 'a', tile: { x: 0, y: 0 } }] }]
};

const openFile = async (text: string, onValidationError: jest.Mock) => {
  const opener: { open: (() => Promise<void>) | null } = { open: null };
  const Opener = () => {
    const open = useImportFile();
    useEffect(() => {
      opener.open = open;
    }, [open]);
    return null;
  };
  act(() => {
    render(
      <Reticulyne initialData={diagram} onValidationError={onValidationError}>
        <Opener />
      </Reticulyne>
    );
  });
  // Catch the file input Open creates, instead of a real file picker.
  const realCreate = document.createElement.bind(document);
  let input: HTMLInputElement | null = null;
  jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    const el = realCreate(tag);
    if (tag === 'input') {
      input = el as HTMLInputElement;
      input.click = () => {};
    }
    return el;
  }) as typeof document.createElement);
  await act(async () => {
    await opener.open!();
  });
  const file = new File([text], 'file.json', { type: 'application/json' });
  Object.defineProperty(input!, 'files', { value: [file] });
  await act(async () => {
    await (input!.onchange as (e: unknown) => Promise<void>)({
      target: input
    });
  });
};

test('a JSON file that is not a diagram goes to onValidationError', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const onValidationError = jest.fn();
  await openFile('{"hello":"world"}', onValidationError);
  await waitFor(() => {
    expect(onValidationError).toHaveBeenCalled();
  });
  // The host hears the file's name, so its message can name it.
  expect(onValidationError.mock.calls[0][1]).toEqual({ fileName: 'file.json' });
});

test('a file that is not JSON goes to onValidationError', async () => {
  const onValidationError = jest.fn();
  await openFile('not json {', onValidationError);
  await waitFor(() => {
    expect(onValidationError).toHaveBeenCalledWith(
      [expect.objectContaining({ message: 'Imported file is not valid JSON' })],
      { fileName: 'file.json' }
    );
  });
});
