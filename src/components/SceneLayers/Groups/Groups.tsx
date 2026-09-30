import { useMemo } from 'react';
import chroma from 'chroma-js';
import { Box, Typography, useTheme } from '@mui/material';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getTilePosition, groupBounds, groupChain } from 'src/utils';
import type { Coords } from 'src/types';

const PAD = 0.4;

// each group as a faint area under its members, labelled with
// its name. Outermost groups are drawn first so nested ones sit on top.
// The group being edited (double-click) gets a stronger outline.
export const Groups = () => {
  const theme = useTheme();
  const { currentView } = useScene();
  const editingGroupId = useUiStateStore((state) => {
    return state.editingGroupId;
  });

  const drawn = useMemo(() => {
    return (currentView.groups ?? [])
      .map((group) => {
        const tight = groupBounds(currentView, group.id);
        if (!tight) return null;
        // A little room around the members, so a group in a row is an
        // area rather than a strip exactly one tile wide.
        const bounds = {
          from: { x: tight.from.x - PAD, y: tight.from.y - PAD },
          to: { x: tight.to.x + PAD, y: tight.to.y + PAD }
        };
        const corners: Coords[] = [
          bounds.from,
          { x: bounds.to.x, y: bounds.from.y },
          bounds.to,
          { x: bounds.from.x, y: bounds.to.y }
        ];
        // The name goes under the corner nearest the bottom of the screen:
        // node labels rise above their nodes, so the top corner collides.
        const bottom = corners
          .map((tile) => {
            return getTilePosition({
              tile,
              origin: 'BOTTOM',
              projection: currentView.kind
            });
          })
          .sort((a, b) => {
            return b.y - a.y;
          })[0];
        return {
          group,
          bounds,
          bottom,
          depth: groupChain(currentView, group.id).length
        };
      })
      .filter((g): g is NonNullable<typeof g> => {
        return g !== null;
      })
      .sort((a, b) => {
        return a.depth - b.depth;
      });
  }, [currentView]);

  return (
    <>
      {drawn.map(({ group, bounds, bottom }) => {
        const editing = group.id === editingGroupId;
        return (
          <Box key={group.id} data-testid="group-area">
            <IsoTileArea
              from={bounds.from}
              to={bounds.to}
              cornerRadius={22}
              fill={
                group.color
                  ? chroma(group.color).alpha(0.25).css()
                  : theme.palette.action.hover
              }
              stroke={{
                width: editing ? 4 : 2,
                color: editing
                  ? theme.palette.primary.main
                  : theme.palette.text.disabled,
                dashArray: editing ? undefined : '10 8'
              }}
            />
            {group.name && (
              <Box
                sx={{ position: 'absolute', pointerEvents: 'none' }}
                style={{ left: bottom.x, top: bottom.y + 6 }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                    display: 'block'
                  }}
                >
                  {group.name}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </>
  );
};
