/**
 * @jest-environment jsdom
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SaveStatusPill } from '../SaveStatusPill';

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
