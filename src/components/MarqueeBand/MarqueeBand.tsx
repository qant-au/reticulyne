import { Box } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { TRANSFORM_CONTROLS_COLOR } from 'src/config';

const strokeWidth = 2;

// 1.4: the visible rubber band: the rectangle the pointer draws, in px
// over the canvas. It is not in a scene layer (zoom and scroll do not
// apply), because it is what the marquee catches against: everything it
// visibly touches (getItemsInScreenRect). It used to be the box of tiles
// between the two corners, which in the isometric view is a thin diamond
// that missed nodes plainly inside the drag (sweep 2026-09-30).
export const MarqueeBand = () => {
  const mode = useUiStateStore((state) => {
    return state.mode;
  });

  if (mode.type !== 'MARQUEE') return null;

  const { from, to } = mode;

  return (
    <Box
      data-testid="marquee-band"
      sx={{
        position: 'absolute',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        bgcolor: `${TRANSFORM_CONTROLS_COLOR}1f`,
        border: `${strokeWidth}px dashed ${TRANSFORM_CONTROLS_COLOR}`
      }}
      style={{
        left: Math.min(from.x, to.x),
        top: Math.min(from.y, to.y),
        width: Math.abs(to.x - from.x),
        height: Math.abs(to.y - from.y)
      }}
    />
  );
};
