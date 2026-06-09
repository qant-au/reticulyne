import { useMemo } from 'react';
import { getItemById } from 'src/utils';
import { useScene } from 'src/hooks/useScene';

export const useRectangle = (id: string) => {
  const { rectangles } = useScene();

  const rectangle = useMemo(() => {
    // A deleted rectangle's component goes through one final render cycle
    // before unmounting. Return null rather than throwing so the component
    // can bail out cleanly instead of hitting ReticulyneErrorBoundary.
    return getItemById(rectangles, id);
  }, [rectangles, id]);

  return rectangle;
};
