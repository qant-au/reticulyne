/**
 * @jest-environment jsdom
 */
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitForElementToBeRemoved
} from '@testing-library/react';
import { SaveStatusPill, TIP_PIN_MS } from '../SaveStatusPill';

let saveStatus = {
  state: 'idle',
  isDirty: true,
  lastSavedAt: null as number | null,
  savedFingerprint: 'x',
  error: null as string | null
};

jest.mock('src/stores/uiStateStore', () => {
  return {
    useUiStateStore: (selector: (state: unknown) => unknown) => {
      return selector({ onSave: () => {}, saveStatus, actions: {} });
    }
  };
});

jest.mock('src/stores/modelStore', () => {
  return {
    useModelStore: (selector: (state: unknown) => unknown) => {
      return selector({ actions: {} });
    }
  };
});

afterEach(() => {
  cleanup();
});

// Sweep 2026-09-30, round 3: at 390 "Unsaved changes" wrapped to two lines
// and kept its width while the title shrank to a few letters. On a phone
// (compact) it says the same in one word, and it never wraps.
describe('SaveStatusPill', () => {
  test('in full at desktop width, on one line', () => {
    render(<SaveStatusPill />);
    const pill = screen.getByTestId('save-status');
    expect(pill.textContent).toBe('Unsaved changes');
    expect(getComputedStyle(pill).whiteSpace).toBe('nowrap');
  });

  // Round 4: the full wording was only in a native title, which a tap
  // never shows and assistive tech did not read. It is now the text a
  // screen reader reads, and a tooltip a tap opens.
  test('shortened when compact; a screen reader and a tap get the full wording', async () => {
    render(<SaveStatusPill compact />);
    const pill = screen.getByTestId('save-status');
    expect(pill.querySelector('[aria-hidden]')?.textContent).toBe('Unsaved');
    expect(pill.textContent).toContain('Unsaved changes');
    fireEvent.click(pill);
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      'Unsaved changes'
    );
  });

  // Round 5: on a touch tap the tooltip was added at opacity 0 and removed
  // ~200 ms later - the emulated mouse "left" the pill when the larger touch
  // tooltip landed under the finger. A tap now pins it until a tap
  // elsewhere, or TIP_PIN_MS.
  test('a tap pins the tooltip: a mouse leave keeps it, a tap elsewhere closes it', async () => {
    render(<SaveStatusPill compact />);
    const pill = screen.getByTestId('save-status');
    fireEvent.click(pill);
    await screen.findByRole('tooltip');
    fireEvent.mouseLeave(pill);
    fireEvent.pointerDown(pill);
    await new Promise((r) => {
      setTimeout(r, 50);
    });
    expect(screen.queryByRole('tooltip')).not.toBeNull();
    fireEvent.pointerDown(document.body);
    await waitForElementToBeRemoved(() => {
      return screen.queryByRole('tooltip');
    });
  });

  test('a pinned tooltip closes by itself after TIP_PIN_MS', async () => {
    jest.useFakeTimers();
    try {
      render(<SaveStatusPill compact />);
      fireEvent.click(screen.getByTestId('save-status'));
      expect(screen.queryByRole('tooltip')).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(TIP_PIN_MS - 100);
      });
      expect(screen.queryByRole('tooltip')).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(200);
      });
      // then the fade-out
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Saved just now" is "Saved" when compact', () => {
    saveStatus = {
      ...saveStatus,
      state: 'saved',
      isDirty: false,
      lastSavedAt: Date.now()
    };
    render(<SaveStatusPill compact />);
    expect(
      screen.getByTestId('save-status').querySelector('[aria-hidden]')
        ?.textContent
    ).toBe('Saved');
  });
});
