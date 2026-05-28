import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Stack,
  Typography,
  Divider
} from '@mui/material';

interface Props {
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V', 'S'], description: 'Select' },
      { keys: ['H'], description: 'Hand' },
      { keys: ['A'], description: 'Add item' },
      { keys: ['R'], description: 'Rectangle' },
      { keys: ['C'], description: 'Connector' },
      { keys: ['T'], description: 'Text' }
    ]
  },
  {
    title: 'Zoom & Navigation',
    shortcuts: [
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['0'], description: 'Reset zoom' },
      { keys: ['F'], description: 'Fit to view' },
      { keys: ['Space', 'drag'], description: 'Pan' }
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['⌘/Ctrl', 'Z'], description: 'Undo' },
      { keys: ['⌘/Ctrl', '⇧', 'Z'], description: 'Redo' },
      { keys: ['⌘/Ctrl', 'C'], description: 'Copy' },
      { keys: ['⌘/Ctrl', 'V'], description: 'Paste' },
      { keys: ['⌘/Ctrl', 'D'], description: 'Duplicate' },
      { keys: ['Del', '⌫'], description: 'Delete' }
    ]
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['↑', '↓', '←', '→'], description: 'Nudge' },
      { keys: ['⇧', '↑↓←→'], description: 'Nudge ×5' },
      { keys: ['Esc'], description: 'Deselect' }
    ]
  },
  {
    title: 'General',
    shortcuts: [{ keys: ['?'], description: 'Toggle this dialog' }]
  }
];

const KbdChip = ({ label }: { label: string }) => {
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'grey.800',
        color: 'grey.100',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        fontWeight: 600,
        lineHeight: 1.5,
        border: '1px solid',
        borderColor: 'grey.600',
        boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </Box>
  );
};

const ShortcutRow = ({ keys, description }: Shortcut) => {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.5
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
        {description}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        {keys.map((key) => {
          return <KbdChip key={key} label={key} />;
        })}
      </Stack>
    </Stack>
  );
};

export const KeyboardShortcutsDialog = ({ onClose }: Props) => {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {SHORTCUT_SECTIONS.map((section, sectionIndex) => {
            return (
              <React.Fragment key={section.title}>
                {sectionIndex > 0 && <Divider />}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.disabled',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    {section.title}
                  </Typography>
                  <Stack>
                    {section.shortcuts.map((shortcut) => {
                      return (
                        <ShortcutRow
                          key={shortcut.description}
                          keys={shortcut.keys}
                          description={shortcut.description}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              </React.Fragment>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
