import type ChromaJs from 'chroma-js';
import { getColorVariant, parseColor, withAlpha } from '../color';

// The real chroma-js: the suite maps 'chroma-js' to a mock (jest.config.js).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chroma: typeof ChromaJs = require('../../../node_modules/chroma-js/dist/chroma.cjs');

// The viewer's shading must match the editor's (chroma-js) exactly, or the
// two draw connectors and zone outlines in different colours.

const SAMPLES = [
  '#a5b8f3',
  '#5b6ab1',
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#f6faff',
  '#df004c',
  '#1976d2',
  '#7f7f7f',
  '#ffcc00',
  '#123456',
  '#abc',
  '#2e7d32',
  '#c62828',
  '#8e24aa',
  '#00acc1',
  '#fdd835',
  '#3949ab'
];

const chromaVariant = (
  color: string,
  variant: 'light' | 'dark',
  alpha: number,
  grade: number
) => {
  return variant === 'light'
    ? chroma(color).brighten(grade).alpha(alpha).css()
    : chroma(color).darken(grade).saturate(grade).alpha(alpha).css();
};

const channels = (css: string) => {
  return css.match(/[\d.]+/g)!.map(Number);
};

describe('viewer colour shading', () => {
  it.each(SAMPLES)('matches chroma-js for %s', (color) => {
    for (const variant of ['light', 'dark'] as const) {
      for (const grade of [1, 2]) {
        for (const alpha of [1, 0.5]) {
          const ours = channels(
            getColorVariant(color, variant, { alpha, grade })
          );
          const theirs = channels(chromaVariant(color, variant, alpha, grade));
          expect(ours).toHaveLength(theirs.length);
          ours.forEach((value, i) => {
            // Rounding of a value that lands on .5 may differ by one.
            expect(Math.abs(value - theirs[i])).toBeLessThanOrEqual(1);
          });
        }
      }
    }
  });

  it('writes alpha as chroma-js does', () => {
    expect(withAlpha('#a5b8f3', 0.25)).toBe(
      chroma('#a5b8f3').alpha(0.25).css()
    );
    expect(withAlpha('#a5b8f3', 1)).toBe(chroma('#a5b8f3').alpha(1).css());
  });

  it('reads hex and rgb() and leaves anything else alone', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('#ff000080')?.[3]).toBeCloseTo(128 / 255);
    expect(parseColor('rgb(1, 2, 3)')).toEqual([1, 2, 3, 1]);
    expect(parseColor('rgba(1,2,3,0.5)')).toEqual([1, 2, 3, 0.5]);
    expect(parseColor('rgb(1 2 3 / 50%)')).toEqual([1, 2, 3, 0.5]);
    expect(parseColor('papayawhip')).toBeNull();
    expect(getColorVariant('papayawhip', 'dark')).toBe('papayawhip');
  });
});
