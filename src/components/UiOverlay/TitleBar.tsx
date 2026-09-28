// Bottom-center title strip — displays "<project title> > <view name>".
// Visible whenever the current editorMode includes 'VIEW_TITLE' in its
// availableTools allowlist.
//
// Extracted from UiOverlay.tsx under QUA4-10.

import { Box, Stack, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { UiElement } from 'src/components/UiElement/UiElement';
import type { Size } from 'src/types/common';
import { SaveStatusPill } from './SaveStatusPill';

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

  // Between the zoom controls and the mini-map it needs about 500px of
  // canvas to itself. Narrower (a phone), it covered the zoom row, so it
  // moves up a row and spans the width, the title truncating.
  const narrow = rendererSize.width < 800;

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
        top: narrow
          ? rendererSize.height - appPadding.y * 3 - 8
          : rendererSize.height - appPadding.y * 2,
        width: narrow
          ? rendererSize.width - appPadding.x * 2
          : rendererSize.width - 500,
        height: appPadding.y
      }}
    >
      <UiElement
        sx={{
          display: 'inline-flex',
          px: 2,
          alignItems: 'center',
          height: '100%',
          maxWidth: '100%'
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            noWrap
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
          <SaveStatusPill />
        </Stack>
      </UiElement>
    </Box>
  );
};
