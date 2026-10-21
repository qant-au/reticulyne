/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { Label, labelOffset } from '../Label';
import { labelPositionOptions } from 'src/types';

// A node's label hangs off the end of a leader that runs `labelHeight` from
// the node towards its compass point; the box sits beyond the leader's end,
// away from the node, so the leader meets its nearest edge.

afterEach(() => {
  cleanup();
});

test('the leader ends labelHeight away in the direction of the position', () => {
  expect(labelOffset(100, 'N')).toEqual({ x: 0, y: -100 });
  expect(labelOffset(100, 'S')).toEqual({ x: 0, y: 100 });
  expect(labelOffset(100, 'E')).toEqual({ x: 100, y: 0 });
  expect(labelOffset(100, 'W')).toEqual({ x: -100, y: 0 });
  const d = 100 * Math.SQRT1_2;
  expect(labelOffset(100, 'NE')).toEqual({ x: d, y: -d });
  expect(labelOffset(100, 'SW')).toEqual({ x: -d, y: d });
});

test('above is the default, drawn as it always was', () => {
  const { getByText, getByTestId } = render(
    <Label maxWidth={200} labelHeight={80} expandDirection="BOTTOM">
      <span>Switch</span>
    </Label>
  );
  const box = getByText('Switch').parentElement as HTMLElement;
  expect(box.style.left).toBe('0px');
  expect(box.style.top).toBe('-80px');
  expect(box.style.transform).toBe('translate(-50%, -100%)');
  const line = getByTestId('label-leader').querySelector('line')!;
  expect(line.getAttribute('x2')).toBe('0');
  expect(line.getAttribute('y2')).toBe('-80');
});

test('every compass point puts the box beyond the leader, away from the node', () => {
  const hang: Record<string, string> = {
    N: 'translate(-50%, -100%)',
    NE: 'translate(0, -100%)',
    E: 'translate(0, -50%)',
    SE: 'translate(0, 0)',
    S: 'translate(-50%, 0)',
    SW: 'translate(-100%, 0)',
    W: 'translate(-100%, -50%)',
    NW: 'translate(-100%, -100%)'
  };
  for (const position of labelPositionOptions) {
    const { getByText, unmount } = render(
      <Label
        maxWidth={200}
        labelHeight={100}
        labelPosition={position}
        expandDirection="BOTTOM"
      >
        <span>{position}</span>
      </Label>
    );
    const box = getByText(position).parentElement as HTMLElement;
    const end = labelOffset(100, position);
    expect(box.style.left).toBe(`${end.x}px`);
    expect(box.style.top).toBe(`${end.y}px`);
    expect(box.style.transform).toBe(hang[position]);
    unmount();
  }
});

test('a label with no leader is centred on its anchor, whatever its position', () => {
  const { getByText } = render(
    <Label maxWidth={200} labelHeight={0} labelPosition="E">
      <span>Link</span>
    </Label>
  );
  const box = getByText('Link').parentElement as HTMLElement;
  expect(box.style.transform).toBe('translate(-50%, -50%)');
  expect(box.style.left).toBe('0px');
});
