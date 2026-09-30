import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Projection, View } from 'src/types';

/** How a view is drawn: its `kind`, 'iso' when it has none. */
export const viewProjection = (
  views: Pick<View, 'id' | 'kind'>[],
  viewId: string
): Projection => {
  return (
    views.find((view) => {
      return view.id === viewId;
    })?.kind ?? 'iso'
  );
};

/** How the current view is drawn: isometric, or flat (schematic). */
export const useProjection = (): Projection => {
  const viewId = useUiStateStore((state) => {
    return state.view;
  });

  return useModelStore((state) => {
    return viewProjection(state.views, viewId);
  });
};
