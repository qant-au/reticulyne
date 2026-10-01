import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useLayerFilter } from 'src/hooks/sceneLists';
import { useIcon } from 'src/hooks/useIcon';
import { filterViewByLayers, getTilePosition } from 'src/utils';
import type { Coords, ModelItem, View, ViewItem } from 'src/types';

// The other floors, drawn faintly above and below the one on show,
// a storey apart, so the building reads as a stack: enough to follow the
// topology, not enough to compete with the floor being edited. Only
// isometric floors stack; they cannot be clicked, and they are never in an
// export (a NON_INTERACTIVE render) or while the floor on show is flat.

/** How far apart two floors are drawn, in screen pixels at zoom 1. */
export const FLOOR_SPACING = PROJECTED_TILE_SIZE.height * 4;
export const OTHER_FLOOR_OPACITY = 0.18;

const GhostNode = ({ item, node }: { item?: ModelItem; node: ViewItem }) => {
  const { iconComponent } = useIcon(item?.icon, 'iso');
  const position = getTilePosition({ tile: node.tile, origin: 'BOTTOM' });
  if (!iconComponent) return null;
  return (
    <Box
      sx={{ position: 'absolute', zIndex: -node.tile.x - node.tile.y }}
      style={{ left: position.x, top: position.y }}
    >
      <Box sx={{ position: 'absolute' }}>{iconComponent}</Box>
    </Box>
  );
};

// A connector as a straight run through its ends and waypoints. The real
// route is worked out per floor on show; this only has to read as a link.
const ghostPaths = (view: View): string[] => {
  const tiles = new Map(
    view.items.map((item) => {
      return [item.id, item.tile];
    })
  );
  return (view.connectors ?? []).flatMap((connector) => {
    const points = connector.anchors.flatMap(({ ref }): Coords[] => {
      const tile = ref.item !== undefined ? tiles.get(ref.item) : ref.tile;
      return tile ? [getTilePosition({ tile })] : [];
    });
    if (points.length < 2) return [];
    return [
      points
        .map((p, i) => {
          return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
        })
        .join(' ')
    ];
  });
};

const GhostFloor = ({
  view,
  offset,
  items
}: {
  view: View;
  offset: number;
  items: Map<string, ModelItem>;
}) => {
  const paths = useMemo(() => {
    return ghostPaths(view);
  }, [view]);
  return (
    <Box
      data-testid={`other-floor-${view.id}`}
      sx={{ position: 'absolute', pointerEvents: 'none' }}
      style={{
        transform: `translateY(${offset}px)`,
        opacity: OTHER_FLOOR_OPACITY
      }}
    >
      <Box
        component="svg"
        sx={{ position: 'absolute', overflow: 'visible' }}
        width={1}
        height={1}
      >
        {paths.map((d, i) => {
          return (
            <Box
              component="path"

              key={i}
              d={d}
              fill="none"
              strokeWidth={6}
              strokeLinejoin="round"
              sx={{
                stroke: (theme) => {
                  return theme.palette.text.primary;
                }
              }}
            />
          );
        })}
      </Box>
      {view.items.map((node) => {
        return (
          <GhostNode key={node.id} node={node} item={items.get(node.id)} />
        );
      })}
    </Box>
  );
};

export const OtherFloors = memo(() => {
  const views = useModelStore((state) => {
    return state.views;
  });
  const modelItems = useModelStore((state) => {
    return state.items;
  });
  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  const show = useUiStateStore((state) => {
    return state.showOtherFloors && state.editorMode !== 'NON_INTERACTIVE';
  });
  const leftOut = useLayerFilter();

  const items = useMemo(() => {
    return new Map(
      modelItems.map((item) => {
        return [item.id, item];
      })
    );
  }, [modelItems]);

  const current = views.findIndex((v) => {
    return v.id === currentViewId;
  });
  if (!show || current === -1 || views[current].kind === 'schematic') {
    return null;
  }

  return (
    <>
      {views.map((view, index) => {
        if (index === current || view.kind === 'schematic') return null;
        return (
          <GhostFloor
            key={view.id}
            view={filterViewByLayers(view, leftOut)}
            offset={(current - index) * FLOOR_SPACING}
            items={items}
          />
        );
      })}
    </>
  );
});

OtherFloors.displayName = 'OtherFloors';
