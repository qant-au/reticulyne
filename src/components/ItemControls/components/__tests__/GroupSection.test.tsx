/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { GroupSection } from '../GroupSection';

const view = {
  groups: [] as { id: string; members: unknown[] }[]
};

jest.mock('src/hooks/useScene', () => {
  return {
    useScene: () => {
      return {
        currentView: view,
        colors: [],
        groupSelection: () => {},
        ungroupSelection: () => {},
        updateGroup: () => {}
      };
    }
  };
});

jest.mock('src/stores/uiStateStore', () => {
  return {
    useUiStateStore: (selector: (state: unknown) => unknown) => {
      return selector({
        editorMode: 'EDITABLE',
        editingGroupId: null,
        actions: { setEditingGroupId: () => {} }
      });
    }
  };
});

const selection = [
  { type: 'ITEM' as const, id: 'a' },
  { type: 'ITEM' as const, id: 'b' }
];

const setPlatform = (platform: string) => {
  Object.defineProperty(window.navigator, 'platform', {
    value: platform,
    configurable: true
  });
};

afterEach(() => {
  setPlatform('');
});

// Sweep 2026-09-30: the inspector said "Group (Ctrl+G)" on macOS while the
// shortcuts dialog said ⌘ G. The hint now comes from the keymap, formatted
// for the platform as the dialog formats it.
test('the Group hint reads ⌘ G on macOS', () => {
  setPlatform('MacIntel');
  render(<GroupSection selection={selection} />);
  expect(screen.getByRole('button').textContent).toBe('Group (⌘ G)');
});

test('the Group hint reads Ctrl + G elsewhere', () => {
  setPlatform('Win32');
  render(<GroupSection selection={selection} />);
  expect(screen.getByRole('button').textContent).toBe('Group (Ctrl + G)');
});
