// Bottom-center title strip — displays "<project title> > <floors>": the
// view name, or (lw-053) the floor switcher when there is more than one
// view or the diagram is editable.
// Visible whenever the current editorMode includes 'VIEW_TITLE' in its
// availableTools allowlist.
//
// Extracted from UiOverlay.tsx under QUA4-10.

import { Box, Stack, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import type { Size } from 'src/types/common';
import { SaveStatusPill } from './SaveStatusPill';
import { FloorSwitcher } from './FloorSwitcher';
import { Surface } from 'src/vendor/accurona-ui';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  appPadding: AppPadding;
  rendererSize: Size;
  title: string;
}

export const TitleBar = ({
  visible,
  appPadding,
  rendererSize,
  title
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
          : rendererSize.width - 600,
        height: appPadding.y
      }}
    >
      <Surface
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
          <FloorSwitcher />
          <SaveStatusPill />
        </Stack>
      </Surface>
    </Box>
  );
};
