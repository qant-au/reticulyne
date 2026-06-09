import { memo, useMemo } from 'react';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { useSceneItemsList } from 'src/hooks/sceneLists';
import { Node } from './Node/Node';

export const Nodes = memo(() => {
  const nodes = useSceneItemsList();
  const activeHighlightId = useActiveHighlightId();

  const ordered = useMemo(() => {
    return [...nodes].reverse();
  }, [nodes]);

  return (
    <>
      {ordered.map((node) => {
        return (
          <Node
            key={node.id}
            order={-node.tile.x - node.tile.y}
            node={node}
            isDimmed={
              activeHighlightId !== null && activeHighlightId !== node.id
            }
          />
        );
      })}
    </>
  );
});

Nodes.displayName = 'Nodes';
