import { ViewItem } from 'src/types';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { Node } from './Node/Node';

interface Props {
  nodes: ViewItem[];
}

export const Nodes = ({ nodes }: Props) => {
  const activeHighlightId = useActiveHighlightId();

  return (
    <>
      {[...nodes].reverse().map((node) => {
        return (
          <Node
            key={node.id}
            order={-node.tile.x - node.tile.y}
            node={node}
            isDimmed={activeHighlightId !== null && activeHighlightId !== node.id}
          />
        );
      })}
    </>
  );
};
