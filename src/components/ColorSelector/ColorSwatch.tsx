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
      sx={{ width: 40, height: 40, minWidth: 'auto' }}
    >
      <Box>
        <Box
          sx={[
            {
              border: '1px solid',
              borderColor: 'grey.600',
              bgcolor: hex,
              width: 28,
              height: 28,
              trasformOrigin: 'center',
              borderRadius: '100%'
            },
            isActive
              ? {
                  transform: {
                    transform: 1.25
                  }
                }
              : {
                  transform: {
                    transform: 1
                  }
                }
          ]}
        />
      </Box>
    </Button>
  );
};
