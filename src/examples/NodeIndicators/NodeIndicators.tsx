// FEA5-07: standalone showcase of the `nodeIndicatorComponent` prop.
// Three nodes, each carrying a static status pip in its corner. No
// state machine, no pulses — just the indicator surface, so a host
// reading this example can see exactly what the prop wires up.
import { Box, Typography } from '@mui/material';
import Reticulyne from 'src/Reticulyne';
import { icons, colors } from '../initialData';
import type { InitialData, ModelItem } from 'src/types';
import { useExamplesThemeMode } from '../themeModeContext';

type Status = 'up' | 'degraded' | 'down';

const NODE_STATUS: Record<string, Status> = {
  primary: 'up',
  replica: 'degraded',
  archive: 'down'
};

const statusColor: Record<Status, string> = {
  up: '#1f9d55',
  degraded: '#f59e0b',
  down: '#dc2626'
};

const indicatorsInitialData: InitialData = {
  title: 'Node indicators',
  icons,
  colors,
  items: [
    { id: 'primary', name: 'Primary', icon: 'storage' },
    { id: 'replica', name: 'Replica', icon: 'storage' },
    { id: 'archive', name: 'Archive', icon: 'storage' }
  ],
  views: [
    {
      id: 'view-indicators',
      name: 'Indicators',
      items: [
        { id: 'primary', tile: { x: -4, y: 0 } },
        { id: 'replica', tile: { x: 0, y: 0 } },
        { id: 'archive', tile: { x: 4, y: 0 } }
      ]
    }
  ],
  view: 'view-indicators',
  fitToView: true
};

const StatusPip = ({ item }: { item: ModelItem }) => {
  const status = NODE_STATUS[item.id] ?? 'up';
  return (
    <Box
      data-testid={`status-pip-${item.id}`}
      sx={{
        position: 'absolute',
        right: -28,
        top: -68,
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: statusColor[status],
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}
      title={`${item.name}: ${status}`}
    />
  );
};

export const NodeIndicators = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Reticulyne
        initialData={indicatorsInitialData}
        editorMode="EXPLORABLE_READONLY"
        nodeIndicatorComponent={StatusPip}
        themeMode={themeMode}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: 1.5,
          bgcolor: 'rgba(255,255,255,0.9)',
          borderRadius: 1,
          pointerEvents: 'none',
          maxWidth: 320
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Node indicators (FEA5-07)
        </Typography>
        <Typography variant="caption" component="div">
          The host passes <code>nodeIndicatorComponent</code> to{' '}
          <code>&lt;Reticulyne&gt;</code>; it renders for every node and can
          read host state via closure.
        </Typography>
      </Box>
    </Box>
  );
};
