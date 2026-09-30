/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { TitleBar } from '../TitleBar';

// The floor switcher and save status read the stores; the layout does not.
jest.mock('../FloorSwitcher', () => {
  return {
    FloorSwitcher: () => {
      return null;
    }
  };
});
jest.mock('../SaveStatusPill', () => {
  return {
    SaveStatusPill: () => {
      return null;
    }
  };
});

afterEach(() => {
  cleanup();
});

const appPadding = { x: 40, y: 40 };

const box = (width: number, bottomRowWidth?: number) => {
  const { container } = render(
    <TitleBar
      visible
      appPadding={appPadding}
      rendererSize={{ width, height: 900 }}
      title="A long diagram title that goes on and on and on"
      bottomRowWidth={bottomRowWidth}
    />
  );
  const el = container.firstElementChild as HTMLElement;
  return {
    left: parseFloat(el.style.left),
    width: parseFloat(el.style.width),
    top: parseFloat(el.style.top)
  };
};

describe('TitleBar layout (BUG15-34)', () => {
  test('at full width it keeps clear of the measured zoom row', () => {
    // The zoom row with the 2D toggle, Layers and ?: 40 + 384 = 424.
    const { left, width } = box(1440, 384);
    expect(left).toBeGreaterThanOrEqual(40 + 384);
    // Centred: the same reserve on the right.
    expect(left + width).toBe(1440 - left);
  });

  test('before the row is measured it reserves 300px a side, as before', () => {
    expect(box(1440)).toMatchObject({ left: 300, width: 840 });
  });

  test('with no room between the row and the mini-map it moves up a row, clear of the mini-map', () => {
    const { left, width, top } = box(900, 384);
    expect(top).toBeLessThan(900 - 40 * 2);
    expect(left).toBe(40);
    // The mini-map is 200px wide, 16px in from the right.
    expect(left + width).toBeLessThanOrEqual(900 - 216);
  });

  test('on a phone it spans the width a row up', () => {
    expect(box(390, 300)).toMatchObject({ left: 40, width: 310 });
  });
});
