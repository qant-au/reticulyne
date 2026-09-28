import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Stack,
  Typography,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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

// In a row's keys, adjacent keys are one chord (drawn joined by +) and OR
// separates alternatives: ['F', OR, '⇧', '1'] is "F, or Shift+1".
const OR = '|';

// UXA-01: the tool row mirrors Excalidraw's, letter and number both, so
// muscle memory carries between the two editors. Excalidraw's free-form
// tools (diamond, ellipse, line, freedraw, eraser) have no isometric
// equivalent and are deliberately unbound.
const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V', OR, 'S', OR, '1'], description: 'Select' },
      { keys: ['H'], description: 'Pan' },
      { keys: ['R', OR, '2'], description: 'Rectangle' },
      { keys: ['A', OR, 'C', OR, '5'], description: 'Connector' },
      { keys: ['T', OR, '8'], description: 'Text' },
      { keys: ['I', OR, '9'], description: 'Add item' }
    ]
  },
  {
    title: 'Zoom & Navigation',
    shortcuts: [
      { keys: ['+', OR, '⌘/Ctrl', '='], description: 'Zoom in' },
      { keys: ['-', OR, '⌘/Ctrl', '-'], description: 'Zoom out' },
      { keys: ['⌘/Ctrl', '0'], description: 'Reset zoom' },
      { keys: ['F', OR, '⇧', '1'], description: 'Fit to view' },
      { keys: ['⇧', '2'], description: 'Fit to selection' },
      { keys: ['Space', 'drag'], description: 'Pan' }
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['⌘/Ctrl', 'Z'], description: 'Undo' },
      { keys: ['⌘/Ctrl', '⇧', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo (alternative)' },
      { keys: ['⌘/Ctrl', 'C'], description: 'Copy selection' },
      { keys: ['⌘/Ctrl', 'X'], description: 'Cut selection' },
      { keys: ['⌘/Ctrl', 'V'], description: 'Paste' },
      { keys: ['⌘/Ctrl', 'D'], description: 'Duplicate selection' },
      { keys: ['⌘/Ctrl', 'G'], description: 'Group the selection' },
      {
        keys: ['⌘/Ctrl', '⇧', 'G'],
        description: 'Ungroup the selection'
      },
      { keys: ['Del', OR, '⌫'], description: 'Delete selection' },
      { keys: ['⌘/Ctrl', ']'], description: 'Bring forward' },
      { keys: ['⌘/Ctrl', '['], description: 'Send backward' },
      { keys: ['⌘/Ctrl', '⇧', ']'], description: 'Bring to front' },
      { keys: ['⌘/Ctrl', '⇧', '['], description: 'Send to back' }
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
      { keys: ['⌘/Ctrl', 'F'], description: 'Find items' },
      { keys: ['↑↓←→'], description: 'Nudge' },
      { keys: ['⇧', '↑↓←→'], description: 'Nudge ×5' },
      { keys: ['Esc'], description: 'Deselect' }
    ]
  },
  {
    // UXA-05: the pointer gestures, which a keyboard list otherwise hides.
    title: 'Mouse & touch',
    shortcuts: [
      { keys: ['Double-click'], description: 'Add an item on an empty tile' },
      {
        keys: ['Double-click'],
        description: 'Work inside a group (Esc to leave)'
      },
      { keys: ['Drag from port'], description: 'Connect two items' },
      { keys: ['Alt', 'drag'], description: 'Drag a copy' },
      { keys: ['Pinch'], description: 'Zoom (touch)' }
    ]
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Toggle this dialog' },
      { keys: ['Alt', 'I'], description: 'Toggle item highlighting' },
      { keys: ['Alt', '⇧', 'D'], description: 'Toggle light / dark' }
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
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ flexShrink: 0, alignItems: 'center' }}
      >
        {keys.map((key, i) => {
          if (key === OR) {
            return (
              <Typography
                key={`or-${i}`}
                variant="caption"
                sx={{ color: 'text.secondary', px: 0.25 }}
              >
                or
              </Typography>
            );
          }
          const joined = i > 0 && keys[i - 1] !== OR;
          return (
            <Stack
              key={`${key}-${i}`}
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              {joined && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  +
                </Typography>
              )}
              <KbdChip label={key} />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export const KeyboardShortcutsDialog = ({ onClose }: Props) => {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>Keyboard Shortcuts</DialogTitle>
      {/* Esc and ? close it too, but on a phone the backdrop left to tap
          is a thin strip. */}
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
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
          <Divider />
          {/* UXA-05: say what is absent on purpose, so nobody hunts for it. */}
          <Box data-testid="excalidraw-differences">
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
              Differences from Excalidraw
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No diamond, ellipse, line, freedraw, eraser, frame, laser or
              eye-dropper: this editor places icons on an isometric grid rather
              than drawing free shapes. No element lock or flip. A plain mouse
              wheel pans; hold Ctrl/⌘ to zoom.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
