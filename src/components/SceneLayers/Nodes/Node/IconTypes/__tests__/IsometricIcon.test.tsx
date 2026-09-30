/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import { IsometricIcon } from '../IsometricIcon';

// Sweep 2026-09-30 (A14/A18): the icon was placed by its measured size,
// which arrived a frame after the image loaded, so an export captured in
// between drew it a whole icon height below its node. It is now anchored
// by its own box, needing no measurement.
test('an isometric icon stands on its point without being measured', () => {
  const { container } = render(<IsometricIcon url="data:image/svg+xml,x" />);
  const img = container.querySelector('img')!;
  const style = getComputedStyle(img);
  expect(style.transform).toBe('translate(-50%, -100%)');
  expect(style.top).toBe('0px');
  expect(style.left).toBe('0px');
});
