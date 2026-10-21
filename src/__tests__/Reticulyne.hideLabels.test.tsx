/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, cleanup, act, screen } from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import type { InitialData } from 'src/types';

// Hide labels: the nodes' labels are display state, not diagram. The host
// starts them with `showLabels`, the toolbar button and Alt+L flip them for
// the session, and `useReticulyne().setLabelsVisible()` drives it from code.

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

const icon =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';

const data: InitialData = {
  title: 'Labels',
  icons: [{ id: 'i', name: 'I', url: icon, isIsometric: true }],
  colors: [],
  items: [
    { id: 'sw', name: 'Core switch', icon: 'i' },
    { id: 'srv', name: 'Server', icon: 'i' }
  ],
  views: [
    {
      id: 'v',
      name: 'V',
      items: [
        { id: 'sw', tile: { x: 0, y: 0 } },
        { id: 'srv', tile: { x: 2, y: 0 } }
      ]
    }
  ]
};

let api: ReturnType<typeof useReticulyne> | null = null;
const Capture = () => {
  const hook = useReticulyne();
  useEffect(() => {
    api = hook;
  });
  return null;
};

test('labels draw by default and the toolbar button hides and shows them', () => {
  render(<Reticulyne initialData={data} />);
  expect(screen.getByText('Core switch')).toBeTruthy();
  expect(screen.getByText('Server')).toBeTruthy();

  act(() => {
    screen.getByRole('button', { name: 'Hide labels (Alt+L)' }).click();
  });
  expect(screen.queryByText('Core switch')).toBeNull();
  expect(screen.queryByText('Server')).toBeNull();

  act(() => {
    screen.getByRole('button', { name: 'Show labels (Alt+L)' }).click();
  });
  expect(screen.getByText('Core switch')).toBeTruthy();
});

test('showLabels={false} starts with the labels hidden, and the hook changes it', () => {
  const { rerender } = render(
    <Reticulyne initialData={data} showLabels={false}>
      <Capture />
    </Reticulyne>
  );
  expect(screen.queryByText('Core switch')).toBeNull();
  // The nodes are still there: only their labels are gone.
  expect(
    screen.getByRole('button', { name: 'Show labels (Alt+L)' })
  ).toBeTruthy();

  act(() => {
    api!.setLabelsVisible(true);
  });
  expect(screen.getByText('Core switch')).toBeTruthy();

  // A change to the prop applies over the session toggle.
  rerender(
    <Reticulyne initialData={data} showLabels={false}>
      <Capture />
    </Reticulyne>
  );
  // Same value as before: no change, the hook's setting stands.
  expect(screen.getByText('Core switch')).toBeTruthy();
  rerender(
    <Reticulyne initialData={data} showLabels>
      <Capture />
    </Reticulyne>
  );
  rerender(
    <Reticulyne initialData={data} showLabels={false}>
      <Capture />
    </Reticulyne>
  );
  expect(screen.queryByText('Core switch')).toBeNull();
});

test('the button is there in the read-only modes too', () => {
  render(<Reticulyne initialData={data} editorMode="EXPLORABLE_READONLY" />);
  expect(
    screen.getByRole('button', { name: 'Hide labels (Alt+L)' })
  ).toBeTruthy();
});
