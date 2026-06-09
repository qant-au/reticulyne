import { memo, useMemo } from 'react';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { useSceneRectanglesList } from 'src/hooks/sceneLists';
import { Rectangle } from './Rectangle';

export const Rectangles = memo(() => {
  const rectangles = useSceneRectanglesList();
  const activeHighlightId = useActiveHighlightId();

  const ordered = useMemo(() => {
    return [...rectangles]
      .sort((a, b) => {
        return (a.zIndex ?? 0) - (b.zIndex ?? 0);
      })
      .reverse();
  }, [rectangles]);

  return (
    <>
      {ordered.map((rectangle) => {
        return (
          <Rectangle
            key={rectangle.id}
            {...rectangle}
            isDimmed={
              activeHighlightId !== null && activeHighlightId !== rectangle.id
            }
          />
        );
      })}
    </>
  );
});

Rectangles.displayName = 'Rectangles';
