import { memo, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useLayerFilter } from 'src/hooks/sceneLists';
import { useView } from 'src/hooks/useView';
import { useProjection } from 'src/hooks/useProjection';
import {
  floorStubs,
  getProjectedTileSize,
  getTilePosition,
  modelFromModelStore,
  type FloorStub
} from 'src/utils';

// lw-053: a connection to an item on another floor, drawn on this floor as
// a riser from the item, up or down towards the other floor, ending at a
// transition marker that names the floor and the item. Clicking the marker
// shows that floor with the item selected (not in a NON_INTERACTIVE render,
// which is an export and has no pointer).

// Stubs on one item stand side by side, this far apart.
const SPREAD = 36;

const Stub = ({
  stub,
  floorName,
  itemName,
  interactive,
  onFollow
}: {
  stub: FloorStub;
  floorName: string;
  itemName: string;
  interactive: boolean;
  onFollow: (stub: FloorStub) => void;
}) => {
  const projection = useProjection();
  const tileHeight = getProjectedTileSize(projection).height;
  const rise =
    Math.round(tileHeight * 1.6) * (stub.direction === 'up' ? -1 : 1);
  const origin = getTilePosition({ tile: stub.tile, projection });
  const x = origin.x + (stub.index - (stub.count - 1) / 2) * SPREAD;
  const y = origin.y;
  const Arrow = stub.direction === 'up' ? ArrowUpwardIcon : ArrowDownwardIcon;
  const label = `${floorName} · ${itemName || 'Untitled'}`;

  return (
    <Box
      data-testid={`floor-stub-${stub.connectionId}-${stub.itemId}`}
      sx={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <Box
        component="svg"
        sx={{ position: 'absolute', overflow: 'visible' }}
        style={{ left: x, top: y }}
        width={1}
        height={1}
      >
        <Box
          component="line"
          x1={0}
          y1={0}
          x2={0}
          y2={rise}
          strokeWidth={4}
          strokeDasharray="8 6"
          strokeLinecap="round"
          sx={{
            stroke: (theme) => {
              return theme.palette.text.secondary;
            }
          }}
        />
        <Box
          component="rect"
          x={-7}
          y={rise - 7}
          width={14}
          height={14}
          transform={`rotate(45 0 ${rise})`}
          sx={{
            fill: (theme) => {
              return theme.palette.primary.main;
            }
          }}
        />
      </Box>
      <Box
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Go to ${label}` : undefined}
        title={interactive ? `Go to ${label}` : undefined}
        onClick={
          interactive
            ? (e) => {
                e.stopPropagation();
                onFollow(stub);
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFollow(stub);
                }
              }
            : undefined
        }
        sx={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          whiteSpace: 'nowrap',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          pointerEvents: interactive ? 'auto' : 'none',
          cursor: interactive ? 'pointer' : 'default',
          transform: `translate(-50%, ${stub.direction === 'up' ? '-100%' : '0'})`
        }}
        style={{
          left: x,
          top: y + rise + (stub.direction === 'up' ? -12 : 12)
        }}
      >
        <Arrow sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

export const FloorStubs = memo(() => {
  const views = useModelStore((state) => {
    return state.views;
  });
  const connections = useModelStore((state) => {
    return state.connections;
  });
  const items = useModelStore((state) => {
    return state.items;
  });
  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const leftOut = useLayerFilter();
  // Not useScene: it subscribes to the scene store, which changes on every
  // drag step, and this layer need not redraw for that.
  const { changeView } = useView();

  const stubs = useMemo(() => {
    return floorStubs(views, currentViewId, connections, leftOut);
  }, [views, currentViewId, connections, leftOut]);

  const names = useMemo(() => {
    return {
      views: new Map(
        views.map((v) => {
          return [v.id, v.name];
        })
      ),
      items: new Map(
        items.map((i) => {
          return [i.id, i.name];
        })
      )
    };
  }, [views, items]);

  const follow = (stub: FloorStub) => {
    uiStateActions.clearSelection();
    changeView(stub.remoteViewId, modelFromModelStore(modelActions.get()));
    const view = views.find((v) => {
      return v.id === stub.remoteViewId;
    });
    const tile = view?.items.find((i) => {
      return i.id === stub.remoteItemId;
    })?.tile;
    if (editorMode === 'EDITABLE') {
      uiStateActions.setSelection([{ type: 'ITEM', id: stub.remoteItemId }]);
    }
    if (tile) {
      const { zoom, scroll } = uiStateActions.get();
      const p = getTilePosition({ tile, projection: view?.kind ?? 'iso' });
      uiStateActions.setScroll({
        position: { x: -p.x * zoom, y: -p.y * zoom },
        offset: scroll.offset
      });
    }
  };

  return (
    <>
      {stubs.map((stub) => {
        return (
          <Stub
            key={`${stub.connectionId}:${stub.itemId}`}
            stub={stub}
            floorName={names.views.get(stub.remoteViewId) ?? ''}
            itemName={names.items.get(stub.remoteItemId) ?? ''}
            interactive={editorMode !== 'NON_INTERACTIVE'}
            onFollow={follow}
          />
        );
      })}
    </>
  );
});

FloorStubs.displayName = 'FloorStubs';
