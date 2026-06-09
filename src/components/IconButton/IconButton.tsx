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
  const iconColor = useMemo(() => {
    if (isActive) {
      return 'grey.200';
    }

    if (disabled) {
      return 'grey.800';
    }

    return 'grey.500';
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
      <Button
        variant="text"
        onClick={onClick}
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
                bgcolor: 'primary.light'
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
    </Tooltip>
  );
};
