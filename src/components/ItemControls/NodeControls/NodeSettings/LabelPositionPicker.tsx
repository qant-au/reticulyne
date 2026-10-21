import { Box, IconButton, Tooltip } from '@mui/material';
import type { LabelPosition } from 'src/types';

// An 8-point compass: which way a node's label sits from the node. The
// middle cell is the node; each other cell is a compass point.
const CELLS: (LabelPosition | null)[] = [
  'NW',
  'N',
  'NE',
  'W',
  null,
  'E',
  'SW',
  'S',
  'SE'
];

export const LABEL_POSITION_NAMES: Record<LabelPosition, string> = {
  N: 'Label above',
  NE: 'Label above right',
  E: 'Label right',
  SE: 'Label below right',
  S: 'Label below',
  SW: 'Label below left',
  W: 'Label left',
  NW: 'Label above left'
};

// A short line from the centre towards each point, so the cell reads as a
// direction without a label of its own.
const ANGLE: Record<LabelPosition, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315
};

interface Props {
  value: LabelPosition;
  onChange: (position: LabelPosition) => void;
}

export const LabelPositionPicker = ({ value, onChange }: Props) => {
  return (
    <Box
      role="group"
      aria-label="Label position"
      data-testid="label-position"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 36px)',
        gap: 0.5,
        justifyContent: 'start'
      }}
    >
      {CELLS.map((cell) => {
        if (!cell) {
          return (
            <Box
              key="node"
              aria-hidden="true"
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: 'text.secondary',
                  opacity: 0.5
                }}
              />
            </Box>
          );
        }
        const selected = cell === value;
        return (
          <Tooltip key={cell} title={LABEL_POSITION_NAMES[cell]}>
            <IconButton
              size="small"
              aria-label={LABEL_POSITION_NAMES[cell]}
              aria-pressed={selected}
              onClick={() => {
                onChange(cell);
              }}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'action.selected' : 'transparent',
                color: selected ? 'primary.main' : 'text.secondary'
              }}
            >
              <Box
                component="svg"
                viewBox="0 0 20 20"
                sx={{ width: 18, height: 18 }}
                style={{ transform: `rotate(${ANGLE[cell]}deg)` }}
              >
                <line
                  x1="10"
                  y1="13"
                  x2="10"
                  y2="4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 8 L10 3 L14 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Box>
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};
