import { useMemo } from 'react';
import { getItemById } from 'src/utils';
import { useScene } from 'src/hooks/useScene';

export const useViewItem = (id: string) => {
  const { items } = useScene();

  const viewItem = useMemo(() => {
    // A deleted item's child components go through one final render cycle
    // before unmounting. Return null rather than throwing so the component
    // can bail out cleanly instead of hitting IsoflowErrorBoundary.
    return getItemById(items, id);
  }, [items, id]);

  return viewItem;
};
