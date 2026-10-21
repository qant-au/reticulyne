// "Office network, live": the small office network drawn in
// demos/office-network.demo.ts, driven as a status board. A scripted day
// in the life of the network: traffic flows on the trunk links, a laptop
// keeps asking the NAS for files, the fibre service drops and the firewall
// fails over to 4G, the fibre comes back, the mains fail and the UPS
// carries the firewall until they return. Everything the host needs is the
// public API: `useReticulyne().Connector` (update and pulse),
// `nodeIndicatorComponent` and `connectorIndicatorComponent`. A real host
// would feed the same calls from its monitoring system.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Reticulyne, { useReticulyne } from 'src/Reticulyne';
import type { Scene } from 'src/core';
import type { Connector as ConnectorModel, ModelItem } from 'src/types';
import { icons } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';
import { useExamplesValidationError } from '../openErrorContext';
import { officeScene } from './scene';

type Status = 'up' | 'degraded' | 'down';

// The connections, by the ids demos/office-network.demo.ts gives them.
const FIBRE = 'fibre-ont--firewall';
const CELLULAR = 'cellular-router--firewall';
const TRUNKS = [
  'firewall--core-switch',
  'firewall--poe-switch',
  'core-switch--poe-switch'
];
const NAS_PATH = [
  'laptop--ap-rear',
  'ap-rear--poe-switch',
  'core-switch--poe-switch',
  'nas--core-switch'
];
const UPS_DATA = 'ups--core-switch';
const UPS_POWER = 'ups--firewall';

// The built-in drawings, as the other examples carry them, and the colours
// the driver switches the links between.
export const OFFICE_LIVE_SCENE: Scene = {
  ...officeScene,
  icons,
  colors: [
    { id: 'flow', value: '#3b82f6' },
    { id: 'idle', value: '#9ca3af' },
    { id: 'ok', value: '#2ea88e' },
    { id: 'warn', value: '#f59e0b' },
    { id: 'alarm', value: '#dc2626' },
    { id: 'power', value: '#8b5cf6' }
  ]
};

// One cycle is 30 ticks of a second each.
const CYCLE = 30;

interface Phase {
  tick: number;
  fibre: Status;
  failover: boolean;
  mains: boolean;
  caption: string;
}

const phaseAt = (tick: number): Phase => {
  const t = tick % CYCLE;
  if (t < 7) {
    return {
      tick,
      fibre: 'up',
      failover: false,
      mains: true,
      caption:
        'All services up. Traffic on the fibre service; the laptop is pulling files from the NAS.'
    };
  }
  if (t < 9) {
    return {
      tick,
      fibre: 'down',
      failover: false,
      mains: true,
      caption: 'Fibre service down. The firewall has lost its primary WAN.'
    };
  }
  if (t < 16) {
    return {
      tick,
      fibre: 'down',
      failover: true,
      mains: true,
      caption: 'Failed over to 4G. Traffic is flowing on the cellular service.'
    };
  }
  if (t < 20) {
    return {
      tick,
      fibre: 'up',
      failover: false,
      mains: true,
      caption:
        'Fibre restored. Traffic is back on the primary WAN; the 4G link is idle again.'
    };
  }
  if (t < 26) {
    return {
      tick,
      fibre: 'up',
      failover: false,
      mains: false,
      caption:
        'Mains power lost. The UPS is carrying the firewall and reporting over the network.'
    };
  }
  return {
    tick,
    fibre: 'up',
    failover: false,
    mains: true,
    caption: 'Mains back. The UPS is recharging; all services up.'
  };
};

const statusOf = (phase: Phase): Record<string, Status> => {
  return {
    'fibre-ont': phase.fibre,
    'cellular-router': 'up',
    firewall: phase.fibre === 'down' && !phase.failover ? 'degraded' : 'up',
    ups: phase.mains ? 'up' : 'degraded'
  };
};

const statusColor: Record<Status, string> = {
  up: '#2ea88e',
  degraded: '#f59e0b',
  down: '#dc2626'
};

// A status pip above and to the right of every node.
const renderPip = (
  statuses: Record<string, Status>,
  args: { item: ModelItem }
) => {
  const status = statuses[args.item.id] ?? 'up';
  return (
    <Box
      data-testid={`status-pip-${args.item.id}`}
      sx={{
        position: 'absolute',
        right: -30,
        top: -64,
        width: 22,
        height: 22,
        borderRadius: '50%',
        bgcolor: statusColor[status],
        border: '3px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}
      title={`${args.item.name}: ${status}`}
    />
  );
};

// A small reading at the midpoint of the links that carry one.
const renderReading = (phase: Phase, args: { connector: ConnectorModel }) => {
  const readings: Record<string, string | undefined> = {
    [FIBRE]: phase.fibre === 'down' ? 'down' : '412 Mb/s',
    [CELLULAR]: phase.failover ? '38 Mb/s' : 'standby',
    [UPS_POWER]: phase.mains ? 'mains' : 'on battery · 94%'
  };
  const text = readings[args.connector.id];
  if (!text) return null;
  // Nudged off the midpoint, clear of the node drawn over it: the nodes
  // layer sits above the indicators.
  const nudge: Record<string, string> = {
    [FIBRE]: 'translateY(-44px)',
    [CELLULAR]: 'translate(52px, 10px)',
    [UPS_POWER]: 'translateY(-44px)'
  };
  const alarm = text === 'down';
  return (
    <Box
      sx={{
        position: 'absolute',
        transform: `translate(-50%, -50%) ${nudge[args.connector.id]}`,
        px: 1.5,
        py: 0.5,
        borderRadius: 1.5,
        // In scene units: the layer scales with the zoom, so this reads at
        // about 14px when the diagram is fitted to a desktop window.
        fontSize: 24,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: alarm ? '#fff' : '#16213d',
        bgcolor: alarm ? '#dc2626' : 'rgba(255,255,255,0.92)',
        border: '1px solid',
        borderColor: alarm ? '#dc2626' : 'rgba(22,33,61,0.25)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
      }}
    >
      {text}
    </Box>
  );
};

// Drives the editor from inside its tree: connector colours, animation and
// one-shot pulses follow the phase.
const Driver = ({ phase, onTick }: { phase: Phase; onTick: () => void }) => {
  const { Connector, fitToView } = useReticulyne();

  useEffect(() => {
    fitToView();
    const id = window.setInterval(onTick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [fitToView, onTick]);

  useEffect(() => {
    const fibreUp = phase.fibre === 'up';
    Connector.update(FIBRE, {
      color: fibreUp ? 'flow' : 'alarm',
      animated: fibreUp,
      glyph: 'chevron',
      style: fibreUp ? 'SOLID' : 'DASHED'
    });
    Connector.update(CELLULAR, {
      color: phase.failover ? 'warn' : 'idle',
      animated: phase.failover,
      glyph: 'bolt',
      style: phase.failover ? 'SOLID' : 'DOTTED'
    });
    for (const id of TRUNKS) {
      Connector.update(id, { color: 'flow', animated: true, glyph: 'chevron' });
    }
    Connector.update(UPS_POWER, {
      color: phase.mains ? 'power' : 'warn',
      animated: !phase.mains,
      glyph: 'bolt'
    });
    Connector.update(UPS_DATA, { color: phase.mains ? 'idle' : 'warn' });

    // The laptop asks the NAS for a file every other second.
    if (phase.tick % 2 === 0) {
      NAS_PATH.forEach((id, i) => {
        window.setTimeout(() => {
          Connector.pulse(id, { durationMs: 700, glyph: 'square' });
        }, i * 320);
      });
    }
    // On battery, the UPS sends a trap every second.
    if (!phase.mains) {
      Connector.pulse(UPS_DATA, { durationMs: 900, glyph: 'envelope' });
    }
    // The imperative API bypasses the undo stack, so re-firing on every
    // tick is what it is for.
  }, [Connector, phase]);

  return null;
};

export const OfficeNetworkLive = () => {
  const { themeMode } = useExamplesThemeMode();
  const onValidationError = useExamplesValidationError();
  const [tick, setTick] = useState(0);
  const phase = useMemo(() => {
    return phaseAt(tick);
  }, [tick]);
  const onTick = useCallback(() => {
    setTick((t) => {
      return t + 1;
    });
  }, []);

  const statuses = useMemo(() => {
    return statusOf(phase);
  }, [phase]);
  const nodeIndicatorComponent = useMemo(() => {
    return (args: { item: ModelItem }) => {
      return renderPip(statuses, args);
    };
  }, [statuses]);
  const connectorIndicatorComponent = useMemo(() => {
    return (args: { connector: ConnectorModel }) => {
      return renderReading(phase, args);
    };
  }, [phase]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Reticulyne
        initialData={OFFICE_LIVE_SCENE}
        enableAnimation
        editorMode="EXPLORABLE_READONLY"
        nodeIndicatorComponent={nodeIndicatorComponent}
        connectorIndicatorComponent={connectorIndicatorComponent}
        themeMode={themeMode}
        onValidationError={onValidationError}
      >
        <Driver phase={phase} onTick={onTick} />
      </Reticulyne>
      <Box
        data-testid="office-live-caption"
        sx={(t) => {
          return {
            position: 'absolute',
            bottom: 144,
            left: 16,
            maxWidth: 420,
            p: 1.5,
            bgcolor:
              t.palette.mode === 'dark'
                ? 'rgba(30,33,40,0.9)'
                : 'rgba(255,255,255,0.9)',
            color: 'text.primary',
            borderRadius: 1,
            pointerEvents: 'none'
          };
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Office network, live
        </Typography>
        <Typography variant="caption" component="div">
          {phase.caption}
        </Typography>
      </Box>
    </Box>
  );
};
