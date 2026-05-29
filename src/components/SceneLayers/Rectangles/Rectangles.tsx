import { useScene } from 'src/hooks/useScene';
import { Rectangle } from './Rectangle';

interface Props {
  rectangles: ReturnType<typeof useScene>['rectangles'];
}

export const Rectangles = ({ rectangles }: Props) => {
  return (
    <>
      {[...rectangles]
        .sort((a, b) => {
          return (a.zIndex ?? 0) - (b.zIndex ?? 0);
        })
        .reverse()
        .map((rectangle) => {
          return <Rectangle key={rectangle.id} {...rectangle} />;
        })}
    </>
  );
};
