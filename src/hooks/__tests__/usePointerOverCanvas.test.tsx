/**
 * @jest-environment jsdom
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { usePointerOverCanvas } from '../usePointerOverCanvas';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';

afterEach(() => {
  cleanup();
});

test('only a pointer that moves over the canvas counts, not one it appeared under', () => {
  const canvas = document.createElement('div');
  document.body.appendChild(canvas);
  const seen: boolean[] = [];
  const Probe = () => {
    const actions = useUiStateStore((state) => {
      return state.actions;
    });
    useEffect(() => {
      actions.setRendererEl(canvas as HTMLDivElement);
    }, [actions]);
    seen.push(usePointerOverCanvas());
    return null;
  };
  render(
    <UiStateProvider>
      <Probe />
    </UiStateProvider>
  );
  // A canvas that appears under a still pointer gets pointerover alone.
  act(() => {
    fireEvent.pointerOver(canvas);
  });
  expect(seen[seen.length - 1]).toBe(false);
  act(() => {
    fireEvent.pointerMove(canvas);
  });
  expect(seen[seen.length - 1]).toBe(true);
  act(() => {
    fireEvent.pointerLeave(canvas);
  });
  expect(seen[seen.length - 1]).toBe(false);
});
