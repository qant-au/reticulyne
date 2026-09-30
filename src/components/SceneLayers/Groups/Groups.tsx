import { useMemo } from 'react';
import chroma from 'chroma-js';
import { Box, Typography, useTheme } from '@mui/material';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  collapsedBoxes,
  COLLAPSED_BOX_REACH,
  getTilePosition,
  groupAndDescendants,
  groupBounds,
  groupChain,
  groupMembers,
  isInCollapsedGroup,
  sortByPosition
} from 'src/utils';
import type { Coords } from 'src/types';

const PAD = 0.4;
// lw-062: a collapsed group's box, drawn COLLAPSED_BOX_REACH from its
// tile's centre (the area spans whole tiles, so less the half tile).
const BOX = COLLAPSED_BOX_REACH - 0.5;

// each group as a faint area under its members, labelled with
// its name. Outermost groups are drawn first so nested ones sit on top.
// The group being edited (double-click) gets a stronger outline.
export const Groups = () => {
  const theme = useTheme();
  // lw-052: a group is drawn around the members that are shown.
  const { visibleView: currentView, currentView: fullView } = useScene();
  const editingGroupId = useUiStateStore((state) => {
    return state.editingGroupId;
  });
  const selection = useUiStateStore((state) => {
    return state.selection;
  });

  // lw-062: an expanded group reaches round the boxes of the collapsed
  // groups inside it; a group inside a collapsed one is not drawn at all.
  const boxes = useMemo(() => {
    return collapsedBoxes(currentView);
  }, [currentView]);

  const drawn = useMemo(() => {
    return (currentView.groups ?? [])
      .map((group) => {
        if (isInCollapsedGroup(fullView, group.id)) return null;
        const inside = groupAndDescendants(fullView, group.id);
        const boxTiles = boxes
          .filter((b) => {
            return inside.has(b.groupId);
          })
          .map((b) => {
            return b.tile;
          });
        const shown = groupBounds(currentView, group.id);
        const tiles = [...(shown ? [shown.from, shown.to] : []), ...boxTiles];
        if (tiles.length === 0) return null;
        const { lowX, lowY, highX, highY } = sortByPosition(tiles);
        const tight = {
          from: { x: lowX, y: lowY },
          to: { x: highX, y: highY }
        };
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
  }, [currentView, fullView, boxes]);

  const selectedKeys = useMemo(() => {
    return new Set(
      selection.map((s) => {
        return `${s.type}:${s.id}`;
      })
    );
  }, [selection]);

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
      {boxes.map((box) => {
        const group = fullView.groups?.find((g) => {
          return g.id === box.groupId;
        });
        if (!group) return null;
        const members = groupMembers(fullView, group.id);
        const selected =
          members.length > 0 &&
          members.every((m) => {
            return selectedKeys.has(`${m.type}:${m.id}`);
          });
        const label = getTilePosition({
          tile: { x: box.tile.x + BOX, y: box.tile.y - BOX },
          origin: 'BOTTOM',
          projection: currentView.kind
        });
        return (
          <Box
            key={group.id}
            data-testid="collapsed-group"
            data-group-id={group.id}
          >
            <IsoTileArea
              from={{ x: box.tile.x - BOX, y: box.tile.y - BOX }}
              to={{ x: box.tile.x + BOX, y: box.tile.y + BOX }}
              cornerRadius={10}
              fill={
                group.color
                  ? chroma(group.color).alpha(0.6).css()
                  : theme.palette.background.paper
              }
              stroke={{
                width: selected ? 4 : 2,
                color: selected
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary
              }}
            />
            <Box
              sx={{ position: 'absolute', pointerEvents: 'none' }}
              style={{ left: label.x, top: label.y + 6 }}
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
                {`${group.name ?? 'Group'} (${box.count})`}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </>
  );
};
