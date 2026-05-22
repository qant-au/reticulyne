// FEA5-05 + FEA5-06: focused showcase of per-connector glyphs and the
// `animated: true` loop, in isolation from LiveDashboard's state machine.
// Three nodes (client → service → store) with three connectors, each
// animating a different glyph so the surface is visually distinct.
import { Box, Typography } from '@mui/material';
import Isoflow from 'src/Isoflow';
import { icons, colors } from '../initialData';
import type { InitialData } from 'src/types';
import { useExamplesThemeMode } from '../themeModeContext';

const animationsInitialData: InitialData = {
  title: 'Connector animations',
  icons,
  colors,
  items: [
    { id: 'client', name: 'Client', icon: 'office' },
    { id: 'service', name: 'Service', icon: 'function-module' },
    { id: 'store', name: 'Store', icon: 'storage' }
  ],
  views: [
    {
      id: 'view-anim',
      name: 'Animations',
      items: [
        { id: 'client', tile: { x: -4, y: 0 } },
        { id: 'service', tile: { x: 0, y: 0 } },
        { id: 'store', tile: { x: 4, y: 0 } }
      ],
      connectors: [
        {
          id: 'conn-client-service',
          color: 'color1',
          anchors: [
            { id: 'a1', ref: { item: 'client' } },
            { id: 'a2', ref: { item: 'service' } }
          ],
          glyph: 'triangle',
          direction: 'START_TO_END',
          animated: true
        },
        {
          id: 'conn-service-store',
          color: 'color6',
          anchors: [
            { id: 'a3', ref: { item: 'service' } },
            { id: 'a4', ref: { item: 'store' } }
          ],
          glyph: 'dollar',
          direction: 'START_TO_END',
          animated: true
        },
        {
          id: 'conn-store-client',
          color: 'color2',
          anchors: [
            { id: 'a5', ref: { item: 'store' } },
            { id: 'a6', ref: { item: 'client' } }
          ],
          glyph: 'bolt',
          direction: 'START_TO_END',
          animated: true
        }
      ]
    }
  ],
  view: 'view-anim',
  fitToView: true
};

export const ConnectorAnimations = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Isoflow
        initialData={animationsInitialData}
        enableAnimation
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
          Connector animations (FEA5-05 + FEA5-06)
        </Typography>
        <Typography variant="caption" component="div">
          Each connector sets <code>glyph</code> + <code>animated: true</code>;
          the host enables looping via <code>enableAnimation</code> on{' '}
          <code>&lt;Isoflow&gt;</code>.
        </Typography>
      </Box>
    </Box>
  );
};
