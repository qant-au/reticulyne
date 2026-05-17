// Text-box measurement helpers. Uses the browser's canvas
// measureText() API at module-scope-stable cost; jsdom returns a null
// context, which the test suite stubs (see src/hooks/__tests__/
// useScene.test.tsx beforeAll for the pattern).
//
// Extracted from src/utils/renderer.ts under QUA4-07.

import { Coords, Size, TextBox, ProjectionOrientationEnum } from 'src/types';
import {
  TEXTBOX_PADDING,
  TEXTBOX_DEFAULTS,
  TEXTBOX_FONT_WEIGHT,
  UNPROJECTED_TILE_SIZE,
  DEFAULT_FONT_FAMILY
} from 'src/config';
import { CoordsUtils } from './CoordsUtils';
import { toPx } from './common';

interface FontProps {
  fontWeight: number | string;
  fontSize: number;
  fontFamily: string;
}

export const getTextWidth = (text: string, fontProps: FontProps) => {
  if (!text) return 0;

  const paddingX = TEXTBOX_PADDING * UNPROJECTED_TILE_SIZE;
  const fontSizePx = toPx(fontProps.fontSize * UNPROJECTED_TILE_SIZE);
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  context.font = `${fontProps.fontWeight} ${fontSizePx} ${fontProps.fontFamily}`;
  const metrics = context.measureText(text);

  canvas.remove();

  return (metrics.width + paddingX * 2) / UNPROJECTED_TILE_SIZE - 0.8;
};

export const getTextBoxDimensions = (textBox: TextBox): Size => {
  const width = getTextWidth(textBox.content, {
    fontSize: textBox.fontSize ?? TEXTBOX_DEFAULTS.fontSize,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: TEXTBOX_FONT_WEIGHT
  });
  const height = 1;

  return { width, height };
};

export const getTextBoxEndTile = (textBox: TextBox, size: Size): Coords => {
  if (textBox.orientation === ProjectionOrientationEnum.X) {
    return CoordsUtils.add(textBox.tile, {
      x: size.width,
      y: 0
    });
  }

  return CoordsUtils.add(textBox.tile, {
    x: 0,
    y: -size.width
  });
};
