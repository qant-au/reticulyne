import type { ConnectorGlyph, Projection } from 'src/types';
import { svg } from './dom';

// The connector glyphs, drawn as the editor draws them
// (src/components/SceneLayers/Connectors/glyphs.tsx): the same shapes
// round (0, 0), the arrowheads turned with the line, the rest upright, and
// the diamond and square swapped in the flat view.

interface Paint {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

type Draw = (p: Paint) => SVGElement[];

const polygon = (points: string, p: Paint, extra = {}) => {
  return svg('polygon', {
    fill: p.fill,
    stroke: p.stroke,
    'stroke-width': p.strokeWidth,
    points,
    ...extra
  });
};

const limb = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  p: Paint
): SVGElement[] => {
  return [
    svg('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: p.stroke,
      'stroke-width': 5 + p.strokeWidth,
      'stroke-linecap': 'round'
    }),
    svg('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: p.fill,
      'stroke-width': 5,
      'stroke-linecap': 'round'
    })
  ];
};

const SHAPES: Record<ConnectorGlyph, { draw: Draw; rotateWithLine: boolean }> =
  {
    triangle: {
      rotateWithLine: true,
      draw: (p) => {
        return [polygon('17.58,17.01 0,-17.01 -17.58,17.01', p)];
      }
    },
    chevron: {
      rotateWithLine: true,
      draw: (p) => {
        return [polygon('0,-15 -15,5 -9,11 0,-3 9,11 15,5', p)];
      }
    },
    'double-chevron': {
      rotateWithLine: true,
      draw: (p) => {
        return [
          polygon('0,-16 -12,-2 -7,3 0,-8 7,3 12,-2', p),
          polygon('0,-3 -12,11 -7,16 0,5 7,16 12,11', p)
        ];
      }
    },
    'circle-solid': {
      rotateWithLine: false,
      draw: (p) => {
        return [
          svg('circle', {
            cx: 0,
            cy: 0,
            r: 14,
            fill: p.fill,
            stroke: p.stroke,
            'stroke-width': p.strokeWidth
          })
        ];
      }
    },
    'circle-outline': {
      rotateWithLine: false,
      draw: (p) => {
        return [
          svg('circle', {
            cx: 0,
            cy: 0,
            r: 14,
            fill: 'none',
            stroke: p.stroke,
            'stroke-width': 6 + p.strokeWidth
          }),
          svg('circle', {
            cx: 0,
            cy: 0,
            r: 14,
            fill: 'none',
            stroke: p.fill,
            'stroke-width': 6
          })
        ];
      }
    },
    // Drawn pre-skewed for the isometric view (see glyphs.tsx).
    diamond: {
      rotateWithLine: false,
      draw: (p) => {
        return [
          svg('rect', {
            x: -13,
            y: -13,
            width: 26,
            height: 26,
            fill: p.fill,
            stroke: p.stroke,
            'stroke-width': p.strokeWidth
          })
        ];
      }
    },
    square: {
      rotateWithLine: false,
      draw: (p) => {
        return [polygon('0,-16 16,0 0,16 -16,0', p)];
      }
    },
    dollar: {
      rotateWithLine: false,
      draw: (p) => {
        const text = svg('text', {
          x: 0,
          y: 0,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': 32,
          'font-family': 'Arial, sans-serif',
          'font-weight': 'bold',
          fill: p.fill,
          stroke: p.stroke,
          'stroke-width': p.strokeWidth,
          'paint-order': 'stroke'
        });
        text.textContent = '$';
        return [text];
      }
    },
    bolt: {
      rotateWithLine: false,
      draw: (p) => {
        return [polygon('-3,-15 5,-15 -1,-2 7,-2 -5,15 -1,4 -8,4', p)];
      }
    },
    envelope: {
      rotateWithLine: false,
      draw: (p) => {
        return [
          svg('rect', {
            x: -15,
            y: -9,
            width: 30,
            height: 18,
            fill: p.fill,
            stroke: p.stroke,
            'stroke-width': p.strokeWidth
          }),
          svg('polyline', {
            points: '-14,-8 0,3 14,-8',
            fill: 'none',
            stroke: p.stroke,
            'stroke-width': 2
          })
        ];
      }
    },
    person: {
      rotateWithLine: false,
      draw: (p) => {
        return [
          svg('circle', {
            cx: 0,
            cy: -11,
            r: 5,
            fill: p.fill,
            stroke: p.stroke,
            'stroke-width': p.strokeWidth
          }),
          ...limb(0, -6, 0, 5, p),
          ...limb(0, -2, 9, 3, p),
          ...limb(0, 5, -7, 14, p),
          ...limb(0, 5, 7, 14, p)
        ];
      }
    },
    star: {
      rotateWithLine: false,
      draw: (p) => {
        return [
          polygon(
            '0,-15 3.37,-4.64 14.27,-4.64 5.45,1.77 8.82,12.14 0,5.73 -8.82,12.14 -5.45,1.77 -14.27,-4.64 -3.37,-4.64',
            p,
            { 'stroke-linejoin': 'round' }
          )
        ];
      }
    }
  };

const FLAT_SWAP: Partial<Record<ConnectorGlyph, ConnectorGlyph>> = {
  diamond: 'square',
  square: 'diamond'
};

/** A glyph at (x, y), turned by `rotation` if it turns with the line. */
export const glyph = (
  name: ConnectorGlyph | undefined,
  at: { x: number; y: number; rotation: number },
  projection: Projection,
  paint: Paint
) => {
  const entry = SHAPES[name ?? 'triangle'] ?? SHAPES.triangle;
  const key = name ?? 'triangle';
  const drawn =
    projection === 'schematic'
      ? (SHAPES[FLAT_SWAP[key] ?? key] ?? entry)
      : entry;
  const inner = svg(
    'g',
    entry.rotateWithLine ? { transform: `rotate(${at.rotation})` } : {},
    drawn.draw(paint)
  );
  return svg('g', { transform: `translate(${at.x}, ${at.y})` }, [inner]);
};
