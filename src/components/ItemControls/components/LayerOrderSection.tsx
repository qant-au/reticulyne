import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useScene } from 'src/hooks/useScene';
import { ItemReference, LayerOrderingAction } from 'src/types';
import { PanelSection } from 'src/vendor/accurona-ui';

// the four layer actions, for one item or a whole selection
// (moved as one block, one undo step). Ordering is within a kind, so a
// rectangle never passes a text box. Nodes are depth-sorted and are never
// passed in here.
const ACTIONS: {
  action: LayerOrderingAction;
  label: string;
  shortcut: string;
  Icon: typeof FlipToFrontIcon;
}[] = [
  {
    action: 'BRING_TO_FRONT',
    label: 'Front',
    shortcut: 'Ctrl+Shift+]',
    Icon: FlipToFrontIcon
  },
  {
    action: 'BRING_FORWARD',
    label: 'Forward',
    shortcut: 'Ctrl+]',
    Icon: ArrowUpwardIcon
  },
  {
    action: 'SEND_BACKWARD',
    label: 'Backward',
    shortcut: 'Ctrl+[',
    Icon: ArrowDownwardIcon
  },
  {
    action: 'SEND_TO_BACK',
    label: 'Back',
    shortcut: 'Ctrl+Shift+[',
    Icon: FlipToBackIcon
  }
];

interface Props {
  targets: ItemReference[];
  note?: React.ReactNode;
}

export const LayerOrderSection = ({ targets, note }: Props) => {
  const { changeLayerOrder } = useScene();

  if (targets.length === 0) return null;

  return (
    <PanelSection title="Layer order">
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {ACTIONS.map(({ action, label, shortcut, Icon }) => {
          return (
            // describeChild: the shortcut becomes the description, so the
            // accessible name stays the visible label ("Back"), not "Ctrl+[".
            // placement top: below, it covered the wrapped second row.
            <Tooltip
              key={action}
              title={shortcut}
              describeChild
              placement="top"
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<Icon />}
                onClick={() => {
                  changeLayerOrder(action, targets);
                }}
              >
                {label}
              </Button>
            </Tooltip>
          );
        })}
      </Stack>
      {note && (
        <Box sx={{ pt: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {note}
          </Typography>
        </Box>
      )}
    </PanelSection>
  );
};
