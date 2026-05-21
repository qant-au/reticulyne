// FEA5-05: per-connector glyph library. Each glyph is a tiny SVG
// fragment drawn around origin (0,0) and inserted into the parent
// Connector SVG via <GlyphRenderer>. The triangle is the legacy
// default and keeps the exact polygon coords from before, so any
// existing connector that omits the `glyph` field renders byte-
// identical to pre-upgrade behaviour.
//
// Per-glyph `rotateWithLine`:
//   - true:  glyph rotates with the connector direction (arrowheads).
//   - false: glyph stays upright regardless of line direction (text-
//            like or rotation-symmetric shapes).
import { Fragment } from 'react';
import type { FC } from 'react';
import type { ConnectorGlyph } from 'src/types';

export interface GlyphProps {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface GlyphEntry {
  Component: FC<GlyphProps>;
  rotateWithLine: boolean;
  label: string;
}

const Triangle: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <polygon
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      points="17.58,17.01 0,-17.01 -17.58,17.01"
    />
  );
};

const Chevron: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <polygon
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      points="0,-15 -15,5 -9,11 0,-3 9,11 15,5"
    />
  );
};

const DoubleChevron: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <>
      <polygon
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        points="0,-16 -12,-2 -7,3 0,-8 7,3 12,-2"
      />
      <polygon
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        points="0,-3 -12,11 -7,16 0,5 7,16 12,11"
      />
    </>
  );
};

const CircleSolid: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <circle
      cx={0}
      cy={0}
      r={14}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

const CircleOutline: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  // Two-pass ring: an outer stroke acts as the white visibility halo,
  // the inner stroke is the actual glyph body in `fill`.
  return (
    <>
      <circle
        cx={0}
        cy={0}
        r={14}
        fill="none"
        stroke={stroke}
        strokeWidth={6 + strokeWidth}
      />
      <circle cx={0} cy={0} r={14} fill="none" stroke={fill} strokeWidth={6} />
    </>
  );
};

const Diamond: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <polygon
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      points="0,-16 16,0 0,16 -16,0"
    />
  );
};

const Square: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <rect
      x={-13}
      y={-13}
      width={26}
      height={26}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

const Dollar: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  // `paintOrder="stroke"` draws the stroke behind the fill so the
  // visibility halo doesn't smudge the glyph's interior.
  return (
    <text
      x={0}
      y={0}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={32}
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      paintOrder="stroke"
    >
      $
    </text>
  );
};

const Bolt: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <polygon
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      points="-3,-15 5,-15 -1,-2 7,-2 -5,15 -1,4 -8,4"
    />
  );
};

const Envelope: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  return (
    <>
      <rect
        x={-15}
        y={-9}
        width={30}
        height={18}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <polyline
        points="-14,-8 0,3 14,-8"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
      />
    </>
  );
};

const Person: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  // Stick figure: head + torso + one arm + two legs. Visibility halo
  // via doubled strokes (white wide behind, fill on top).
  const limb = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    key: string
  ) => {
    return (
      <Fragment key={key}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={5 + strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={fill}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </Fragment>
    );
  };
  return (
    <>
      <circle
        cx={0}
        cy={-11}
        r={5}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {limb(0, -6, 0, 5, 'torso')}
      {limb(0, -2, 9, 3, 'arm')}
      {limb(0, 5, -7, 14, 'leg-back')}
      {limb(0, 5, 7, 14, 'leg-fore')}
    </>
  );
};

const Star: FC<GlyphProps> = ({ fill, stroke, strokeWidth }) => {
  // 5-point star, outer radius 15, inner radius ~5.73 (R * sin18/sin54).
  return (
    <polygon
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      points="0,-15 3.37,-4.64 14.27,-4.64 5.45,1.77 8.82,12.14 0,5.73 -8.82,12.14 -5.45,1.77 -14.27,-4.64 -3.37,-4.64"
    />
  );
};

export const GLYPHS: Record<ConnectorGlyph, GlyphEntry> = {
  triangle: { Component: Triangle, rotateWithLine: true, label: 'Triangle' },
  chevron: { Component: Chevron, rotateWithLine: true, label: 'Chevron' },
  'double-chevron': {
    Component: DoubleChevron,
    rotateWithLine: true,
    label: 'Double chevron'
  },
  'circle-solid': {
    Component: CircleSolid,
    rotateWithLine: false,
    label: 'Solid dot'
  },
  'circle-outline': {
    Component: CircleOutline,
    rotateWithLine: false,
    label: 'Ring'
  },
  diamond: { Component: Diamond, rotateWithLine: false, label: 'Diamond' },
  square: { Component: Square, rotateWithLine: false, label: 'Square' },
  dollar: { Component: Dollar, rotateWithLine: false, label: 'Dollar' },
  bolt: { Component: Bolt, rotateWithLine: false, label: 'Bolt' },
  envelope: { Component: Envelope, rotateWithLine: false, label: 'Envelope' },
  person: { Component: Person, rotateWithLine: false, label: 'Person' },
  star: { Component: Star, rotateWithLine: false, label: 'Star' }
};

interface GlyphRendererProps {
  glyph?: ConnectorGlyph;
  rotation: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const GlyphRenderer = ({
  glyph = 'triangle',
  rotation,
  fill = 'black',
  stroke = 'white',
  strokeWidth = 4
}: GlyphRendererProps) => {
  const entry = GLYPHS[glyph] ?? GLYPHS.triangle;
  const { Component, rotateWithLine } = entry;
  const transform = rotateWithLine ? `rotate(${rotation})` : undefined;
  return (
    <g transform={transform}>
      <Component fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  );
};
