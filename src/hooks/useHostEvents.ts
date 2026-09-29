import { useEffect, useRef } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { ReticulyneProps, SelectedRef } from 'src/types';

// the selection and viewport callbacks. Both watch the store
// rather than the code paths that change it, so every source counts: a
// click, a marquee, a keyboard shortcut, the mini-map, or the host's own
// imperative call. Neither fires for the initial state.
export const useHostEvents = ({
  onSelectionChange,
  onViewportChange
}: Pick<ReticulyneProps, 'onSelectionChange' | 'onViewportChange'>) => {
  const selection = useUiStateStore((state) => {
    return state.selection;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const scroll = useUiStateStore((state) => {
    return state.scroll.position;
  });
  const viewId = useUiStateStore((state) => {
    return state.view;
  });

  // Latest callbacks in refs, so an inline arrow from the host does not
  // count as a change and re-fire the callback on every parent render.
  const selectionCb = useRef(onSelectionChange);
  const viewportCb = useRef(onViewportChange);
  useEffect(() => {
    selectionCb.current = onSelectionChange;
    viewportCb.current = onViewportChange;
  }, [onSelectionChange, onViewportChange]);

  const seenSelection = useRef(false);
  useEffect(() => {
    if (!seenSelection.current) {
      seenSelection.current = true;
      return;
    }
    selectionCb.current?.(
      selection.map((ref): SelectedRef => {
        return { type: ref.type as SelectedRef['type'], id: ref.id };
      })
    );
  }, [selection]);

  const seenViewport = useRef(false);
  useEffect(() => {
    if (!seenViewport.current) {
      seenViewport.current = true;
      return;
    }
    viewportCb.current?.({
      zoom,
      scroll: { x: scroll.x, y: scroll.y },
      viewId
    });
  }, [zoom, scroll, viewId]);
};
