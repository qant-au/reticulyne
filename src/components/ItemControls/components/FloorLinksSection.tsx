import { useMemo, useState } from 'react';
import {
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useScene } from 'src/hooks/useScene';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { floorStubs } from 'src/utils';
import { PanelSection } from 'src/vendor/accurona-ui';

// lw-053: connections from this item to items on other floors. Each is
// drawn on both floors as a stub; here they are listed, added and removed.
export const FloorLinksSection = ({ itemId }: { itemId: string }) => {
  const { floors, currentView, connections, connectItems, deleteConnection } =
    useScene();
  const items = useModelStore((state) => {
    return state.items;
  });
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });
  const [floorId, setFloorId] = useState('');
  const [targetId, setTargetId] = useState('');

  const names = useMemo(() => {
    return new Map(
      items.map((item) => {
        return [item.id, item.name || 'Untitled'];
      })
    );
  }, [items]);

  const links = useMemo(() => {
    return floorStubs(floors, currentView.id, connections).filter((stub) => {
      return stub.itemId === itemId;
    });
  }, [floors, currentView.id, connections, itemId]);

  const otherFloors = floors.filter((f) => {
    return f.id !== currentView.id;
  });
  const onThisFloor = new Set(
    currentView.items.map((i) => {
      return i.id;
    })
  );
  const linked = new Set(
    connections.flatMap((c) => {
      if (c.from === itemId) return [c.to];
      if (c.to === itemId) return [c.from];
      return [];
    })
  );
  const targets =
    otherFloors
      .find((f) => {
        return f.id === floorId;
      })
      ?.items.filter((i) => {
        return !onThisFloor.has(i.id) && !linked.has(i.id);
      }) ?? [];

  if (!editable || otherFloors.length === 0) return null;

  return (
    <PanelSection title="Links to other floors">
      <Stack spacing={1} data-testid="floor-links">
        {links.map((link) => {
          const floor = floors.find((f) => {
            return f.id === link.remoteViewId;
          });
          const Arrow =
            link.direction === 'up' ? ArrowUpwardIcon : ArrowDownwardIcon;
          return (
            <Stack
              key={link.connectionId}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Arrow fontSize="small" color="action" />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                {floor?.name} · {names.get(link.remoteItemId)}
              </Typography>
              <Tooltip title="Remove link">
                <IconButton
                  size="small"
                  aria-label={`Remove link to ${names.get(link.remoteItemId)}`}
                  onClick={() => {
                    deleteConnection(link.connectionId);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        })}
        <TextField
          select
          size="small"
          label="Floor"
          value={floorId}
          onChange={(e) => {
            setFloorId(e.target.value);
            setTargetId('');
          }}
        >
          {otherFloors.map((f) => {
            return (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            );
          })}
        </TextField>
        <TextField
          select
          size="small"
          label="Item"
          value={targetId}
          disabled={!floorId || targets.length === 0}
          helperText={
            floorId && targets.length === 0
              ? 'Nothing on that floor to link to.'
              : undefined
          }
          onChange={(e) => {
            setTargetId(e.target.value);
          }}
        >
          {targets.map((t) => {
            return (
              <MenuItem key={t.id} value={t.id}>
                {names.get(t.id)}
              </MenuItem>
            );
          })}
        </TextField>
        <Button
          size="small"
          variant="outlined"
          disabled={!targetId}
          onClick={() => {
            connectItems(itemId, targetId);
            setTargetId('');
          }}
        >
          Link
        </Button>
      </Stack>
    </PanelSection>
  );
};
