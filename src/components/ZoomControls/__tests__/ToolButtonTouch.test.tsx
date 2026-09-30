/**
 * @jest-environment jsdom
 */
import {
  render,
  cleanup,
  act,
  fireEvent,
  screen
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { createReticulyneTheme } from 'src/styles/theme';
import { ToolButton } from 'src/vendor/accurona-ui';

// Sweep 2026-09-30 (A06, 390px): after a tap on "Flat 2D view" its tooltip
// stayed up. A tap fires a compatibility mouseover and never a mouseleave.

beforeAll(() => {
  if (!('PointerEvent' in window)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerType: string;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? 'mouse';
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent =
      PointerEventPolyfill;
  }
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

const mount = () => {
  render(
    <ThemeProvider theme={createReticulyneTheme('light')}>
      <ToolButton name="Flat 2D view" icon={<span />} onClick={() => {}} />
    </ThemeProvider>
  );
  return screen.getByRole('button', { name: 'Flat 2D view' });
};

const settle = () => {
  act(() => {
    jest.advanceTimersByTime(2000);
  });
};

test('a tap does not leave the tooltip up', () => {
  const button = mount();
  fireEvent.pointerOver(button, { pointerType: 'touch' });
  fireEvent.pointerDown(button, { pointerType: 'touch' });
  fireEvent.mouseOver(button);
  fireEvent.click(button);
  settle();
  expect(screen.queryByRole('tooltip')).toBeNull();
});

test('a mouse hover still shows it', () => {
  const button = mount();
  fireEvent.pointerOver(button, { pointerType: 'touch' });
  fireEvent.pointerOver(button, { pointerType: 'mouse' });
  fireEvent.mouseOver(button);
  settle();
  expect(screen.getByRole('tooltip').textContent).toContain('Flat 2D view');
});
