/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { ModelProvider, useModelStore } from 'src/stores/modelStore';
import { useIcon } from '../useIcon';
import { DEFAULT_ICON } from 'src/config';

const Wrapper = ({ children }: { children: ReactNode }) => {
  return <ModelProvider>{children}</ModelProvider>;
};

describe('useIcon', () => {
  test('returns DEFAULT_ICON when id is undefined', () => {
    const { result } = renderHook(
      () => {
        return useIcon(undefined);
      },
      { wrapper: Wrapper }
    );
    expect(result.current.icon).toBe(DEFAULT_ICON);
  });

  test('returns DEFAULT_ICON when the id is not present in state.icons (BUG5-04 regression)', () => {
    // Dangling icon ref scenario: a ModelItem outlives the icon it
    // points to because the host swapped palettes through the
    // imperative Model.set API (which bypasses cross-ref validation).
    // Before BUG5-04 this threw inside useMemo on render, surfacing
    // through ReticulyneErrorBoundary for every node referencing the
    // missing icon.
    const { result } = renderHook(
      () => {
        return useIcon('no-such-icon');
      },
      { wrapper: Wrapper }
    );
    expect(result.current.icon).toBe(DEFAULT_ICON);
  });

  test('returns the matching icon when present', () => {
    const { result } = renderHook(
      () => {
        const setModel = useModelStore((s) => {
          return s.actions.set;
        });
        const found = useIcon('icon-real');
        return { setModel, found };
      },
      { wrapper: Wrapper }
    );

    act(() => {
      result.current.setModel((state) => {
        return {
          ...state,
          icons: [{ id: 'icon-real', name: 'Real', url: 'data:image/svg+xml,' }]
        };
      });
    });

    expect(result.current.found.icon.id).toBe('icon-real');
  });
});
