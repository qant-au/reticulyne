/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { FloorPlanSection } from '../FloorPlanSection';

jest.mock('src/stores/uiStateStore', () => {
  return {
    useUiStateStore: (selector: (state: unknown) => unknown) => {
      return selector({ sceneContext: { opened: {} } });
    }
  };
});

jest.mock('src/vendor/accurona-core', () => {
  return {
    objectPlaces: () => {
      return [
        {
          kind: 'plan',
          viewId: 'plan',
          viewName: 'Floor plan',
          floorId: 'g',
          floorName: 'Ground',
          x: 600,
          y: 600
        }
      ];
    }
  };
});

// Sweep 2026-09-30: the plan position rendered visibly smaller than the rest
// of its line. body2 is sized 0.75em, so a body2 span inside a body2 line is
// three quarters of it; the span inherits the line's typography instead.
test('the plan position is set in the same type as its line', () => {
  render(<FloorPlanSection itemId="nvr-1" />);
  const line = screen.getByTestId('floor-plan-location').firstElementChild!;
  expect(line.textContent).toBe('Ground · Floor plan (0.6 m, 0.6 m)');
  const position = line.querySelector('span')!;
  expect(position.className).toContain('MuiTypography-inherit');
  expect(position.className).not.toContain('MuiTypography-body2');
});
