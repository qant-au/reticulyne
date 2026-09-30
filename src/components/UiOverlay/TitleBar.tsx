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

// How far in the title keeps from the left: clear of the zoom row.
const titleReserve = (appPadding: AppPadding, bottomRowWidth: number) => {
  return Math.max(300, appPadding.x + bottomRowWidth + GAP);
};

// And from the right: clear of the mini-map where that shows. Reserving the
// zoom row's width on this side too left the bar ~300px wide beside the
// examples picker, the title cut short beside empty canvas (sweep
// 2026-09-30, round 3).
const rightReserveFor = (rendererWidth: number, appPadding: AppPadding) => {
  return rendererWidth >= MINI_MAP_MIN_WIDTH ? MINI_MAP_RESERVE : appPadding.x;
};

/** Whether the title bar sits a row up, above the zoom row. */
export const titleBarRaised = (
  rendererWidth: number,
  appPadding: AppPadding,
  bottomRowWidth = 0
) => {
  return (
    rendererWidth < MINI_MAP_MIN_WIDTH ||
    rendererWidth -
      titleReserve(appPadding, bottomRowWidth) -
      rightReserveFor(rendererWidth, appPadding) <
      MIN_TITLE_WIDTH
  );
};

// A title this short never truncates: there is nothing to gain from it.
const SHORT_TITLE = 6;

export const TitleBar = ({
  visible,
  appPadding,
  rendererSize,
  title,
  bottomRowWidth = 0
}: Props) => {
  if (!visible) return null;

  // Between the zoom row on the left and the mini-map on the right, each
  // measured or known, centred in that space. The zoom row is measured,
  // since it grows with what the editor offers; a fixed 300px let a long
  // title cover Layers and ? (BUG15-34). With too little room left (a
  // phone), it moves up a row and spans the width, clear of the mini-map
  // where that shows.
  const reserve = titleReserve(appPadding, bottomRowWidth);
  const narrow = titleBarRaised(rendererSize.width, appPadding, bottomRowWidth);
  const rightReserve = rightReserveFor(rendererSize.width, appPadding);
  const left = narrow ? appPadding.x : reserve;
  const short = title.length <= SHORT_TITLE;

  return (
    <Box
      sx={{
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
      style={{
        left,
        top: narrow
          ? rendererSize.height - appPadding.y * 3 - 8
          : rendererSize.height - appPadding.y * 2,
        width: rendererSize.width - left - rightReserve,
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
        <Stack
          direction="row"
          data-testid="title-bar"
          sx={{ alignItems: 'center', minWidth: 0 }}
        >
          {/* Nothing truncates while there is room. When there is not, the
              title gives way first, down to a few letters and an ellipsis;
              then the floors; the save status never. Flex basis 0 is what
              orders it: the title takes only the room the rest leave, and
              once it is at its minimum the floors shrink. A share of the
              bar for the floors (60%) was a share of the bar's own content
              width, so a short title cut "Main" to "M..." with room to
              spare (sweep 2026-09-30, round 3). */}
          <Typography
            noWrap
            data-testid="title-bar-title"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              flex: short ? 'none' : '1 1 0',
              minWidth: short ? undefined : '3em'
            }}
          >
            {title}
          </Typography>
          <ChevronRight sx={{ flexShrink: 0 }} />
          <FloorSwitcher />
          <SaveStatusPill compact={narrow} />
        </Stack>
      </Surface>
    </Box>
  );
};
