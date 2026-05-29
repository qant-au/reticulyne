import { useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';

/**
 * FEA12-01: returns the ID of the one item that should stay at full
 * opacity while everything else dims to 0.2. Returns null when
 * dimming is inactive (nothing to highlight, toggle is off, or no
 * item is selected).
 *
 * Priority:
 *   1. highlightedItemId prop (host-driven override)
 *   2. selectionDimEnabled toggle + current itemControls selection
 */
export const useActiveHighlightId = (): string | null => {
  const selectionDimEnabled = useUiStateStore((s) => {
    return s.selectionDimEnabled;
  });
  const highlightedItemId = useUiStateStore((s) => {
    return s.highlightedItemId;
  });
  const itemControls = useUiStateStore((s) => {
    return s.itemControls;
  });

  return useMemo(() => {
    if (highlightedItemId !== undefined) return highlightedItemId;
    if (!selectionDimEnabled) return null;
    if (!itemControls || itemControls.type === 'ADD_ITEM') return null;
    return itemControls.id;
  }, [selectionDimEnabled, highlightedItemId, itemControls]);
};
