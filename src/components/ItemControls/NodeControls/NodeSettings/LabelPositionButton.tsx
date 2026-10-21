import { useState, type MouseEvent } from 'react';
import { IconButton, Popover, Tooltip, Typography, Box } from '@mui/material';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import type { LabelPosition } from 'src/types';
import { LabelPositionPicker } from './LabelPositionPicker';

// At the top right of the inspector: a compass button whose popover opens
// down and to the left, inside the panel, with the eight points on it.
interface Props {
  value: LabelPosition;
  onChange: (position: LabelPosition) => void;
}

export const LabelPositionButton = ({ value, onChange }: Props) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Label position">
        <IconButton
          size="small"
          aria-label="Label position"
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchor)}
          onClick={(e: MouseEvent<HTMLElement>) => {
            setAnchor(e.currentTarget);
          }}
        >
          <ExploreOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => {
          setAnchor(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { p: 1.5 },
            role: 'dialog',
            'aria-label': 'Label position'
          }
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', textTransform: 'uppercase', pb: 1 }}
        >
          Label position
        </Typography>
        <Box>
          <LabelPositionPicker
            value={value}
            onChange={(position) => {
              onChange(position);
              setAnchor(null);
            }}
          />
        </Box>
      </Popover>
    </>
  );
};
