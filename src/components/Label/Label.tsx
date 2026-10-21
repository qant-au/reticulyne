import React, { useRef } from 'react';
import { Box, SxProps, useTheme } from '@mui/material';
import type { LabelPosition } from 'src/types';

const CONNECTOR_DOT_SIZE = 3;

// Unit vectors for the compass points, y down as on screen.
const DIAGONAL = Math.SQRT1_2;
const DIRECTION: Record<LabelPosition, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  NE: { x: DIAGONAL, y: -DIAGONAL },
  E: { x: 1, y: 0 },
  SE: { x: DIAGONAL, y: DIAGONAL },
  S: { x: 0, y: 1 },
  SW: { x: -DIAGONAL, y: DIAGONAL },
  W: { x: -1, y: 0 },
  NW: { x: -DIAGONAL, y: -DIAGONAL }
};
// How the box hangs off the end of its leader: away from the node, so
// the leader meets the box's nearest edge.
const HANG: Record<LabelPosition, string> = {
  N: 'translate(-50%, -100%)',
  NE: 'translate(0, -100%)',
  E: 'translate(0, -50%)',
  SE: 'translate(0, 0)',
  S: 'translate(-50%, 0)',
  SW: 'translate(-100%, 0)',
  W: 'translate(-100%, -50%)',
  NW: 'translate(-100%, -100%)'
};

/** The end of a label's leader, `labelHeight` away towards `position`. */
export const labelOffset = (labelHeight: number, position: LabelPosition) => {
  const d = DIRECTION[position];
  return { x: d.x * labelHeight, y: d.y * labelHeight };
};

export interface Props {
  labelHeight?: number;
  /** Which way the label sits from its anchor; 'N' (above) by default. */
  labelPosition?: LabelPosition;
  maxWidth: number;
  maxHeight?: number;
  expandDirection?: 'CENTER' | 'BOTTOM';
  children: React.ReactNode;
  sx?: SxProps;
}

export const Label = ({
  children,
  maxWidth,
  maxHeight,
  expandDirection = 'CENTER',
  labelHeight = 0,
  labelPosition = 'N',
  sx
}: Props) => {
  const theme = useTheme();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const end = labelOffset(labelHeight, labelPosition);
  // A label with no leader (a connector's) is centred on its anchor.
  const hang =
    labelHeight > 0 && expandDirection === 'BOTTOM'
      ? HANG[labelPosition]
      : `translate(-50%, ${expandDirection === 'BOTTOM' ? '-100%' : '-50%'})`;

  return (
    <Box
      sx={{
        position: 'absolute',
        width: maxWidth
      }}
    >
      {labelHeight > 0 && (
        <Box
          component="svg"
          data-testid="label-leader"
          // A tiny box at the anchor that the line is allowed to overflow:
          // the sizes are px (an sx width of 1 would mean 100%).
          style={{ width: 4, height: 4 }}
          sx={{
            overflow: 'visible',
            position: 'absolute',
            top: 0,
            left: 0,
            // The leader line runs up from the node's centre, so it sat
            // exactly where people click to select the node and swallowed
            // the press.
            pointerEvents: 'none'
          }}
        >
          <line
            x1={0}
            y1={0}
            x2={end.x}
            y2={end.y}
            strokeDasharray={`0, ${CONNECTOR_DOT_SIZE * 2}`}
            stroke={theme.palette.text.primary}
            strokeWidth={CONNECTOR_DOT_SIZE}
            strokeLinecap="round"
          />
        </Box>
      )}
      <Box
        ref={contentRef}
        sx={{
          position: 'absolute',
          display: 'inline-block',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'grey.400',
          borderRadius: 2,
          py: 1,
          px: 1.5,
          transformOrigin: 'bottom center',
          overflow: 'hidden',
          ...sx
        }}
        style={{
          maxHeight,
          left: end.x,
          top: end.y,
          transform: hang
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
