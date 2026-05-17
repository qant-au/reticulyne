// Bottom-center title strip — displays "<project title> > <view name>".
// Visible whenever the current editorMode includes 'VIEW_TITLE' in its
// availableTools allowlist.
//
// Extracted from UiOverlay.tsx under QUA4-10.

import { Box, Stack, Typography } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import type { Size } from 'src/types/common';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  appPadding: AppPadding;
  rendererSize: Size;
  title: string;
  currentViewName: string;
}

export const TitleBar = ({
  visible,
  appPadding,
  rendererSize,
  title,
  currentViewName
}: Props) => {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        transform: 'translateX(-50%)',
        pointerEvents: 'none'
      }}
      style={{
        left: rendererSize.width / 2,
        top: rendererSize.height - appPadding.y * 2,
        width: rendererSize.width - 500,
        height: appPadding.y
      }}
    >
      <UiElement
        sx={{
          display: 'inline-flex',
          px: 2,
          alignItems: 'center',
          height: '100%'
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <Typography
            sx={{
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            {title}
          </Typography>
          <ChevronRight />
          <Typography
            sx={{
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            {currentViewName}
          </Typography>
        </Stack>
      </UiElement>
    </Box>
  );
};
