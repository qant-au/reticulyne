import { useMemo } from 'react';
import { KeyboardShortcutsDialog as SharedDialog } from 'src/vendor/accurona-ui';
import {
  DIFFERENCES,
  formatDifferences,
  shortcutSections
} from 'src/vendor/accurona-core';
import { KEYMAP } from 'src/interaction/useKeyboardShortcuts';

interface Props {
  onClose: () => void;
}

// The `?` list is the shared keymap's (@accurona/core), so it cannot drift
// from the keys the handler binds; the dialog itself is @accurona/ui's, as
// in Axonometra. Esc and ? close it too, but on a phone the backdrop left to
// tap is a thin strip, so the header keeps its Close button.
export const KeyboardShortcutsDialog = ({ onClose }: Props) => {
  const sections = useMemo(() => {
    return shortcutSections(KEYMAP);
  }, []);
  return (
    <SharedDialog
      open
      onClose={onClose}
      title="Keyboard Shortcuts"
      sections={sections}
      differences={formatDifferences(DIFFERENCES.reticulyne)}
    />
  );
};
