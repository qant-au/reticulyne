import { useCallback } from 'react';
import { useRectangle } from 'src/hooks/useRectangle';
import { AnchorPosition } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { TransformControls } from './TransformControls';

interface Props {
  id: string;
  // 1.4: resize anchors belong to a single selected rectangle. With several
  // items selected the manager renders every outline in this mode, because
  // a grid of corner handles across N rectangles is unusable and dragging
  // one would resize only its own rectangle.
  outlineOnly?: boolean;
}

export const RectangleTransformControls = ({ id, outlineOnly }: Props) => {
  const rectangle = useRectangle(id);
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const onAnchorMouseDown = useCallback(
    (key: AnchorPosition) => {
      if (!rectangle) return;
      uiStateActions.setMode({
        type: 'RECTANGLE.TRANSFORM',
        id: rectangle.id,
        selectedAnchor: key,
        showCursor: true
      });
    },
    [rectangle, uiStateActions]
  );

  if (!rectangle) return null;

  return (
    <TransformControls
      from={rectangle.from}
      to={rectangle.to}
      onAnchorMouseDown={outlineOnly ? undefined : onAnchorMouseDown}
    />
  );
};
