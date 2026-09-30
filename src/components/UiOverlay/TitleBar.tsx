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
  // A row up on a phone, it spans the zoom row below it: capped at the
  // canvas less the padding, it stopped ~30px short of that row's right
  // end, the title cut beside empty space (sweep 2026-09-30, round 4).
  const right = narrow
    ? Math.min(
        rendererSize.width - GAP,
        Math.max(rendererSize.width - rightReserve, left + bottomRowWidth)
      )
    : rendererSize.width - rightReserve;
  const short = title.length <= SHORT_TITLE;

  // Centred on the canvas, under the Diagrams button, whenever it fits;
  // shifted only as far as it must be to keep clear of the zoom row and the
  // mini-map. Centred in the room between them, it sat ~100px right of the
  // canvas centre at 1440 (sweep 2026-09-30, round 4). Two spacers, each
  // its distance from the centre to an edge, shrink by equal amounts (a
  // shrink factor the inverse of the basis), so the bar's centre stays on
  // the canvas centre until a spacer reaches 0; then the other takes the
  // rest. On a phone, the room is the zoom row's span: centred in it.
  const centre = narrow ? (left + right) / 2 : rendererSize.width / 2;
  const toLeft = Math.max(1, centre - left);
  const toRight = Math.max(1, right - centre);
  const spacer = (basis: number) => {
    return (
      <Box
        aria-hidden
        sx={{ minWidth: 0 }}
        // Scaled up: shrink factors summing to under 1 take only that share
        // of the overflow.
        style={{ flex: `0 ${10000 / basis} ${basis}px` }}
      />
    );
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        display: 'flex',
        pointerEvents: 'none'
      }}
      style={{
        left,
        top: narrow
          ? rendererSize.height - appPadding.y * 3 - 8
          : rendererSize.height - appPadding.y * 2,
        width: right - left,
        height: appPadding.y
      }}
    >
      {spacer(toLeft)}
      <Surface
        sx={{
          display: 'inline-flex',
          flexShrink: 0,
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
              then the floors; the save status never. The title's shrink
              factor, far above the floors', is what orders it: it takes
              nearly all the shortfall until it is at its minimum. A share
              of the bar for the floors (60%) was a share of the bar's own
              content width, so a short title cut "Main" to "M..." with
              room to spare (sweep 2026-09-30, round 3); a flex basis of 0
              kept the bar at the width of the rest, the title cut with
              room beside it (round 4). */}
          <Typography
            noWrap
            data-testid="title-bar-title"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              flex: short ? 'none' : '0 100000 auto',
              minWidth: short ? undefined : '3em'
            }}
          >
            {title}
          </Typography>
          <ChevronRight sx={{ flexShrink: 0 }} />
          <FloorSwitcher roomKey={`${title}|${right - left}`} />
          <SaveStatusPill compact={narrow} />
        </Stack>
      </Surface>
      {spacer(toRight)}
    </Box>
  );
};
