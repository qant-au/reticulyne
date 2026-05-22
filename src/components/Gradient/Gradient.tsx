import { Box, SxProps, useTheme } from '@mui/material';

interface Props {
  sx?: SxProps;
}

// FEA7-04: pull the fade-target colour from the theme's `background`
// token so the gradient blends into the active canvas in either
// light or dark mode. Pre-FEA7-04 this was hard-coded white, which
// looked like a stripe over a dark canvas.
const toGradientStops = (background: string): string => {
  // Use the same colour throughout — the gradient stops vary alpha
  // so the host's canvas shows through. MUI's `background.default`
  // is normally an opaque colour; for hex we synthesise rgba; for
  // anything else (theme functions, named colours) we let it ride
  // as a solid fade-to-transparent done via two stops at 0/100%.
  return `linear-gradient(0deg, ${background} 0%, ${background} 5%, transparent 100%)`;
};

export const Gradient = ({ sx }: Props) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        background: toGradientStops(theme.palette.background.default),
        ...sx
      }}
    />
  );
};
