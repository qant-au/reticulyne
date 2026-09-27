import React from 'react';
import { Box, Button } from '@mui/material';

export type Props = {
  hex: string;
  isActive?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
};

export const ColorSwatch = ({ hex, onClick, isActive }: Props) => {
  return (
    <Button
      onClick={onClick}
      variant="text"
      size="small"
      // Swatches were unnamed buttons, and the active one never looked
      // active: the old sx set transform to an object, which is not CSS.
      aria-label={`Colour ${hex}`}
      aria-pressed={isActive ?? false}
      sx={{ width: 40, height: 40, minWidth: 'auto' }}
    >
      <Box>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'grey.600',
            bgcolor: hex,
            width: 28,
            height: 28,
            transformOrigin: 'center',
            borderRadius: '100%',
            transform: isActive ? 'scale(1.25)' : 'none'
          }}
        />
      </Box>
    </Button>
  );
};
