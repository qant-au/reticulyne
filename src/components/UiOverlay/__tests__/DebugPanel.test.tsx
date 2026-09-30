/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { DebugPanel } from '../DebugPanel';

jest.mock('src/components/DebugUtils/DebugUtils', () => {
  return {
    DebugUtils: () => {
      return null;
    }
  };
});

afterEach(() => {
  cleanup();
});

const panel = (width: number, height: number) => {
  const { container } = render(
    <DebugPanel
      visible
      appPadding={{ x: 40, y: 40 }}
      spacing={(n) => {
        return n * 8;
      }}
      rendererSize={{ width, height }}
    />
  );
  return (container.firstElementChild as HTMLElement).style;
};

test('on a phone it fits the width, stops at half the height and sits above the raised title', () => {
  const style = panel(390, 844);
  expect(style.maxWidth).toBe('310px');
  expect(style.maxHeight).toBe('422px');
  // The raised title bar's top is 844 - 3 * 40 - 8.
  expect(parseFloat(style.top)).toBeLessThanOrEqual(844 - 3 * 40 - 8);
});

test('at full width it sits just above the zoom row', () => {
  expect(parseFloat(panel(1440, 900).top)).toBe(900 - 2 * 40 - 8);
});
