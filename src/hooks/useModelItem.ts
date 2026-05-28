import { useMemo } from 'react';
import { ModelItem } from 'src/types';
import { useModelStore } from 'src/stores/modelStore';
import { getItemById } from 'src/utils';

export const useModelItem = (id: string): ModelItem | null => {
  const model = useModelStore((state) => {
    return state;
  });

  const modelItem = useMemo(() => {
    // A deleted item's child components go through one final render cycle
    // before unmounting. Return null rather than throwing so the component
    // can bail out cleanly instead of hitting IsoflowErrorBoundary.
    return getItemById(model.items, id);
  }, [id, model.items]);

  return modelItem;
};
