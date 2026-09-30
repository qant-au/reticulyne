import { useMemo } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { DEFAULT_LABEL_HEIGHT, isEmptyMarkdown } from 'src/config';
import { getProjectedTileSize, getTilePosition } from 'src/utils';
import { useIcon } from 'src/hooks/useIcon';
import { ViewItem } from 'src/types';
import { useModelItem } from 'src/hooks/useModelItem';
import { useProjection } from 'src/hooks/useProjection';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { ExpandableLabel } from 'src/components/Label/ExpandableLabel';
import { MarkdownEditor } from 'src/components/MarkdownEditor/MarkdownEditorLazy';

interface Props {
  node: ViewItem;
  order: number;
  isDimmed?: boolean;
}

// Where a node stands: an isometric node on its tile's bottom vertex, a
// flat one centred on the tile.
const useNodePosition = (node: ViewItem) => {
  const projection = useProjection();
  const position = useMemo(() => {
    return getTilePosition({
      tile: node.tile,
      origin: projection === 'schematic' ? 'CENTER' : 'BOTTOM',
      projection
    });
  }, [node.tile, projection]);
  return { position, projection };
};

// The node's own layer (below its name): who it is, drawn as its icon, and
// the host's indicator slot. Its name and description are NodeLabel, in a
// layer above every node, so a tall icon never covers a name.
export const Node = ({ node, order, isDimmed }: Props) => {
  const modelItem = useModelItem(node.id);
  const { position, projection } = useNodePosition(node);
  const { iconComponent } = useIcon(modelItem?.icon, projection);
  const NodeIndicator = useUiStateStore((state) => {
    return state.nodeIndicatorComponent;
  });

  if (!modelItem) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: order
      }}
      style={{
        opacity: isDimmed ? 0.2 : 1,
        transition: 'opacity 0.3s'
      }}
    >
      <Box
        sx={{ position: 'absolute' }}
        style={{
          left: position.x,
          top: position.y
        }}
      >
        {iconComponent && (
          <Box
            sx={{
              position: 'absolute',
              pointerEvents: 'none'
            }}
          >
            {iconComponent}
          </Box>
        )}
        {NodeIndicator && (
          <Box data-testid="node-indicator-slot" sx={{ position: 'absolute' }}>
            {NodeIndicator({ item: modelItem, view: node })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// A node's name and description, above the node where it always was.
export const NodeLabel = ({ node, order, isDimmed }: Props) => {
  const modelItem = useModelItem(node.id);
  const { position, projection } = useNodePosition(node);

  const description = useMemo(() => {
    if (!modelItem || isEmptyMarkdown(modelItem.description)) return null;

    return modelItem.description;
  }, [modelItem]);

  if (!modelItem || !(modelItem.name || description)) return null;

  return (
    <Box
      // The tour reads where a node's label reaches, to keep it on screen.
      data-node-label={node.id}
      sx={{
        position: 'absolute',
        zIndex: order
      }}
      style={{
        opacity: isDimmed ? 0.2 : 1,
        transition: 'opacity 0.3s'
      }}
    >
      <Box
        sx={{ position: 'absolute' }}
        style={{
          left: position.x,
          top: position.y
        }}
      >
        {/* A name lets the pointer through: it sits over the node's upper
            ports, and a press on it reached no port and started a marquee
            (sweep 2026-09-30). The description (it can hold links) and the
            expand button still take the pointer. */}
        <Box
          sx={{ position: 'absolute', pointerEvents: 'none' }}
          style={{ bottom: getProjectedTileSize(projection).height / 2 }}
        >
          <ExpandableLabel
            maxWidth={250}
            expandDirection="BOTTOM"
            labelHeight={node.labelHeight ?? DEFAULT_LABEL_HEIGHT}
          >
            <Stack spacing={1}>
              {modelItem.name && (
                <Typography
                  sx={{
                    fontWeight: 600,
                    // Inherited, this was the page's black on the dark
                    // theme's dark label background.
                    color: 'text.primary'
                  }}
                >
                  {modelItem.name}
                </Typography>
              )}
              {!isEmptyMarkdown(modelItem.description) && (
                <Box sx={{ pointerEvents: 'auto' }}>
                  <MarkdownEditor value={modelItem.description} readOnly />
                </Box>
              )}
            </Stack>
          </ExpandableLabel>
        </Box>
      </Box>
    </Box>
  );
};
