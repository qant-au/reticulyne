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
import { MIN_CANVAS_WIDTH as MINI_MAP_MIN_WIDTH } from 'src/components/MiniMap/MiniMap';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  appPadding: AppPadding;
  rendererSize: Size;
  title: string;
  // The zoom row's measured width; 0 before it is measured.
  bottomRowWidth?: number;
}

const GAP = 16;
// The mini-map: 200px wide, 16px in from the right.
const MINI_MAP_RESERVE = 16 + 200 + GAP;
// Narrower than this between the zoom row and the mini-map, the title
// moves up a row.
const MIN_TITLE_WIDTH = 240;

// How far in from each side the title keeps: clear of the zoom row on the
// left and the mini-map on the right.
const titleReserve = (appPadding: AppPadding, bottomRowWidth: number) => {
  return Math.max(300, appPadding.x + bottomRowWidth + GAP, MINI_MAP_RESERVE);
};

/** Whether the title bar sits a row up, above the zoom row. */
export const titleBarRaised = (
  rendererWidth: number,
  appPadding: AppPadding,
  bottomRowWidth = 0
) => {
  return (
    rendererWidth < MINI_MAP_MIN_WIDTH ||
    rendererWidth - titleReserve(appPadding, bottomRowWidth) * 2 <
      MIN_TITLE_WIDTH
  );
};

export const TitleBar = ({
  visible,
  appPadding,
  rendererSize,
  title,
  bottomRowWidth = 0
}: Props) => {
  if (!visible) return null;

  // Centred on the bottom row, clear of the zoom row on the left and the
  // mini-map on the right: the same reserve both sides. The zoom row is
  // measured, since it grows with what the editor offers; a fixed 300px
  // let a long title cover Layers and ? (BUG15-34). With too little room
  // left (a phone), it moves up a row and spans the width, clear of the
  // mini-map where that shows, the title truncating.
  const reserve = titleReserve(appPadding, bottomRowWidth);
  const narrow = titleBarRaised(rendererSize.width, appPadding, bottomRowWidth);
  const rightReserve =
    rendererSize.width >= MINI_MAP_MIN_WIDTH ? MINI_MAP_RESERVE : appPadding.x;

  return (
    <Box
      sx={{
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
      style={{
        left: narrow ? appPadding.x : reserve,
        top: narrow
          ? rendererSize.height - appPadding.y * 3 - 8
          : rendererSize.height - appPadding.y * 2,
        width: narrow
          ? rendererSize.width - appPadding.x - rightReserve
          : rendererSize.width - reserve * 2,
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
