import { useScene } from 'src/hooks/useScene';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { Rectangle } from './Rectangle';

interface Props {
  rectangles: ReturnType<typeof useScene>['rectangles'];
}

export const Rectangles = ({ rectangles }: Props) => {
  const activeHighlightId = useActiveHighlightId();

  return (
    <>
      {[...rectangles]
        .sort((a, b) => {
          return (a.zIndex ?? 0) - (b.zIndex ?? 0);
        })
        .reverse()
        .map((rectangle) => {
          return (
            <Rectangle
              key={rectangle.id}
              {...rectangle}
              isDimmed={activeHighlightId !== null && activeHighlightId !== rectangle.id}
            />
          );
        })}
    </>
  );
};
