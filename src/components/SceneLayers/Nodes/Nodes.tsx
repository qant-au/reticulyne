import { memo, useMemo } from 'react';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { useSceneItemsList } from 'src/hooks/sceneLists';
import { Node, NodeLabel } from './Node/Node';

const useOrderedNodes = () => {
  const nodes = useSceneItemsList();
  const activeHighlightId = useActiveHighlightId();

  const ordered = useMemo(() => {
    return [...nodes].reverse();
  }, [nodes]);
  return { ordered, activeHighlightId };
};

export const Nodes = memo(() => {
  const { ordered, activeHighlightId } = useOrderedNodes();

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

// The nodes' names, in their own layer above every node and riser, so a
// tall icon or a cross-floor riser never draws over a name.
export const NodeLabels = memo(() => {
  const { ordered, activeHighlightId } = useOrderedNodes();

  return (
    <>
      {ordered.map((node) => {
        return (
          <NodeLabel
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

NodeLabels.displayName = 'NodeLabels';
