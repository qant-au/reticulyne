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

// UXA-01: the tool row mirrors Excalidraw's, letter and number both, so
// muscle memory carries between the two editors. Excalidraw's free-form
// tools (diamond, ellipse, line, freedraw, eraser) have no isometric
// equivalent and are deliberately unbound.
const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V', 'S', '1'], description: 'Select' },
      { keys: ['H'], description: 'Hand' },
      { keys: ['R', '2'], description: 'Rectangle' },
      { keys: ['A', 'C', '5'], description: 'Connector' },
      { keys: ['T', '8'], description: 'Text' },
      { keys: ['I', '9'], description: 'Add item' }
    ]
  },
  {
    title: 'Zoom & Navigation',
    shortcuts: [
      { keys: ['+', '⌘/Ctrl', '='], description: 'Zoom in' },
      { keys: ['-', '⌘/Ctrl', '-'], description: 'Zoom out' },
      { keys: ['⌘/Ctrl', '0'], description: 'Reset zoom' },
      { keys: ['F', '⇧', '1'], description: 'Fit to view' },
      { keys: ['⇧', '2'], description: 'Fit to selection' },
      { keys: ['Space', 'drag'], description: 'Pan' }
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['⌘/Ctrl', 'Z'], description: 'Undo' },
      { keys: ['⌘/Ctrl', '⇧', 'Z'], description: 'Redo' },
      { keys: ['⌘/Ctrl', 'C'], description: 'Copy active item' },
      { keys: ['⌘/Ctrl', 'X'], description: 'Cut active item' },
      { keys: ['⌘/Ctrl', 'V'], description: 'Paste' },
      { keys: ['⌘/Ctrl', 'D'], description: 'Duplicate active item' },
      { keys: ['Del', '⌫'], description: 'Delete selection' }
    ]
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select' },
      { keys: ['⇧', 'Click'], description: 'Add / remove from selection' },
      { keys: ['Drag'], description: 'Marquee select' },
      { keys: ['⇧', 'Drag'], description: 'Add marquee to selection' },
      { keys: ['⌘/Ctrl', 'A'], description: 'Select all' },
      { keys: ['↑', '↓', '←', '→'], description: 'Nudge' },
      { keys: ['⇧', '↑↓←→'], description: 'Nudge ×5' },
      { keys: ['Esc'], description: 'Deselect' }
    ]
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this dialog' },
      { keys: ['Alt', 'I'], description: 'Toggle item highlighting' }
    ]
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
        {keys.map((key, i) => {
          return <KbdChip key={`${key}-${i}`} label={key} />;
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
              <Box key={section.title}>
                {sectionIndex > 0 && <Divider sx={{ mb: 2 }} />}
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
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
