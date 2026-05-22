// FEA5-07: imperative `useIsoflow().Connector.pulse()` in isolation.
// Two nodes, one connector, one button. Clicking the button fires a
// one-shot glyph travelling along the line — no auto-tick, no model
// mutations. LiveDashboard wires this same call into a setInterval; this
// example strips it back to the bare API.
import { Box, Button, Typography } from '@mui/material';
import Isoflow, { useIsoflow } from 'src/Isoflow';
import { icons, colors } from '../initialData';
import type { InitialData } from 'src/types';
import { useExamplesThemeMode } from '../themeModeContext';

const PULSE_CONNECTOR_ID = 'conn-pulse';

const pulseInitialData: InitialData = {
  title: 'Connector pulse',
  icons,
  colors,
  items: [
    { id: 'producer', name: 'Producer', icon: 'office' },
    { id: 'consumer', name: 'Consumer', icon: 'storage' }
  ],
  views: [
    {
      id: 'view-pulse',
      name: 'Pulse',
      items: [
        { id: 'producer', tile: { x: -3, y: 0 } },
        { id: 'consumer', tile: { x: 3, y: 0 } }
      ],
      connectors: [
        {
          id: PULSE_CONNECTOR_ID,
          color: 'color2',
          anchors: [
            { id: 'a1', ref: { item: 'producer' } },
            { id: 'a2', ref: { item: 'consumer' } }
          ],
          direction: 'START_TO_END'
        }
      ]
    }
  ],
  view: 'view-pulse',
  fitToView: true
};

// Inner driver: must live inside the <Isoflow> tree so `useIsoflow()`
// can resolve the surrounding context providers.
const PulseDriver = () => {
  const { Connector } = useIsoflow();
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 50
      }}
    >
      <Button
        data-testid="pulse-button"
        variant="contained"
        onClick={() => {
          Connector.pulse(PULSE_CONNECTOR_ID, {
            durationMs: 1500,
            glyph: 'bolt'
          });
        }}
      >
        Fire pulse
      </Button>
    </Box>
  );
};

export const ConnectorPulse = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Isoflow
        initialData={pulseInitialData}
        editorMode="EXPLORABLE_READONLY"
        themeMode={themeMode}
      >
        <PulseDriver />
      </Isoflow>
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
          Connector pulse (FEA5-07)
        </Typography>
        <Typography variant="caption" component="div">
          The button calls <code>useIsoflow().Connector.pulse(id)</code> — a
          one-shot glyph that travels the line, then clears itself.
        </Typography>
      </Box>
    </Box>
  );
};
