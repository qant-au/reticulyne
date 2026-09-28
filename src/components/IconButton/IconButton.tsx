import React, { useMemo } from 'react';
import { Button, Box, useTheme } from '@mui/material';
import Tooltip, { TooltipProps } from '@mui/material/Tooltip';

interface Props {
  name: string;
  Icon: React.ReactNode;
  isActive?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tooltipPosition?: TooltipProps['placement'];
  disabled?: boolean;
}

export const IconButton = ({
  name,
  Icon,
  onClick,
  isActive,
  disabled = false,
  tooltipPosition = 'bottom'
}: Props) => {
  const theme = useTheme();
  // Palette roles rather than fixed greys, so both themes read: the
  // active tool's grey.200 icon vanished on dark mode's near-white
  // primary.light, grey.500 was 2.7:1 on white, and "disabled" was
  // grey.800, darker than an enabled icon.
  const iconColor = useMemo(() => {
    if (isActive) {
      return 'primary.contrastText';
    }

    if (disabled) {
      return 'action.disabled';
    }

    return 'text.secondary';
  }, [disabled, isActive]);

  return (
    <Tooltip
      title={name}
      placement={tooltipPosition}
      enterDelay={1000}
      enterNextDelay={1000}
      arrow
      sx={{ bgcolor: 'primary.main' }}
    >
      {/* A disabled button fires no events, so the tooltip needs a
          wrapper to hang on. */}
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <Button
          variant="text"
          onClick={onClick}
          disabled={disabled}
          aria-label={name}
          {...(isActive !== undefined ? { 'aria-pressed': isActive } : {})}
          sx={[
            {
              borderRadius: 0,
              height: theme.customVars.toolMenu.height,
              width: theme.customVars.toolMenu.height,
              maxWidth: '100%',
              minWidth: 'auto',
              p: 0,
              m: 0
            },
            isActive
              ? {
                  // primary.main: white on primary.light was 2.6:1.
                  bgcolor: 'primary.main'
                }
              : {
                  bgcolor: null
                }
          ]}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              svg: {
                color: iconColor
              }
            }}
          >
            {Icon}
          </Box>
        </Button>
      </Box>
    </Tooltip>
  );
};
