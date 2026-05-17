import { Box, CircularProgress, CircularProgressProps } from '@mui/material';

interface Props {
  size?: number;
  color?: CircularProgressProps['color'];
  isInline?: boolean;
}

export const Loader = ({ size = 1, color = 'primary', isInline }: Props) => {
  return (
    <Box
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        isInline
          ? {
              width: 'auto'
            }
          : {
              width: '100%'
            },
        isInline
          ? {
              height: 'auto'
            }
          : {
              height: '100%'
            }
      ]}
    >
      <CircularProgress size={size * 20} color={color} />
    </Box>
  );
};
