/**
 * @jest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react';
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

  test('shortened when compact, the full wording in its tooltip', () => {
    render(<SaveStatusPill compact />);
    const pill = screen.getByTestId('save-status');
    expect(pill.textContent).toBe('Unsaved');
    expect(pill.getAttribute('title')).toBe('Unsaved changes');
  });

  test('"Saved just now" is "Saved" when compact', () => {
    saveStatus = {
      ...saveStatus,
      state: 'saved',
      isDirty: false,
      lastSavedAt: Date.now()
    };
    render(<SaveStatusPill compact />);
    expect(screen.getByTestId('save-status').textContent).toBe('Saved');
  });
});
