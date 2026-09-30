import { useMemo } from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { MEDIA } from 'src/catalogue/media';
import { topologyWarnings } from 'src/catalogue/topology';
import { useScene } from 'src/hooks/useScene';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { ModelItem } from 'src/types';
import { PanelSection } from 'src/vendor/accurona-ui';

// lw-083: a connector's catalogue ports, and the topology rules its
// connection or an object breaks. Warnings only: nothing is refused.

const useWarnings = () => {
  const items = useModelStore((state) => {
    return state.items;
  });
  const { connections } = useScene();
  return useMemo(() => {
    return topologyWarnings(items, connections);
  }, [items, connections]);
};

/** The topology warnings about one object or one connection. */
export const TopologyWarnings = ({
  itemId,
  connectionId
}: {
  itemId?: string;
  connectionId?: string;
}) => {
  const warnings = useWarnings().filter((w) => {
    return (
      (itemId !== undefined && w.items.includes(itemId)) ||
      (connectionId !== undefined && w.connections.includes(connectionId))
    );
  });
  if (warnings.length === 0) return null;
  return (
    <PanelSection title="Topology">
      <Stack spacing={0.5} data-testid="topology-warnings">
        {warnings.map((w) => {
          return (
            <Typography key={w.message} variant="body2" color="warning.main">
              {w.message}
            </Typography>
          );
        })}
      </Stack>
    </PanelSection>
  );
};

const portLabel = (port: NonNullable<ModelItem['ports']>[number]) => {
  const name = port.name ?? port.id;
  return port.kind ? `${name} (${port.kind})` : name;
};

/** The two ports a connector's connection is attached to, editable. */
export const ConnectionPortsSection = ({
  connectionId
}: {
  connectionId?: string;
}) => {
  const { connections, updateConnection } = useScene();
  const items = useModelStore((state) => {
    return state.items;
  });
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });
  const connection = connections.find((c) => {
    return c.id === connectionId;
  });
  if (!connection) return null;
  const itemOf = (id: string) => {
    return items.find((i) => {
      return i.id === id;
    });
  };
  const ends = [
    {
      key: 'fromPort',
      item: itemOf(connection.from),
      port: connection.fromPort
    },
    { key: 'toPort', item: itemOf(connection.to), port: connection.toPort }
  ] as const;

  return (
    <PanelSection title="Ports">
      <Stack spacing={1.5} data-testid="connection-ports">
        {ends.map(({ key, item, port }) => {
          const ports = item?.ports ?? [];
          return (
            <TextField
              key={key}
              select
              size="small"
              label={item?.name || 'Untitled'}
              value={port ?? ''}
              disabled={!editable}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                const next = ports.find((p) => {
                  return p.id === e.target.value;
                });
                if (!next) return;
                updateConnection(connection.id, {
                  [key]: next.id,
                  ...(next.kind ? { kind: next.kind } : {})
                });
              }}
            >
              {ports.map((p) => {
                return (
                  <MenuItem key={p.id} value={p.id}>
                    {portLabel(p)}
                  </MenuItem>
                );
              })}
            </TextField>
          );
        })}
        {connection.kind && (
          <Typography variant="body2" color="text.secondary">
            Medium:{' '}
            {MEDIA.find((m) => {
              return m.id === connection.kind;
            })?.name ?? connection.kind}
          </Typography>
        )}
      </Stack>
    </PanelSection>
  );
};
