// FEA5-08: live-dashboard example. Demonstrates all three primitives
// added in FEA5-05/06/07:
//   - per-connector glyph (set on the connectors below)
//   - `enableAnimation` + `animated: true` for the persistent loop
//   - `useIsoflow().Connector.pulse()` for one-shot signal pulses
//   - `nodeIndicatorComponent` for live status pips next to each node
//
// The data layer is a tiny simulated state machine — `useState` +
// `setInterval` driven from a child component that calls
// `useIsoflow()`. Real hosts would swap this for a websocket
// subscription, a polling fetch, or whatever feeds them live state.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Isoflow, { useIsoflow } from 'src/Isoflow';
import { icons, colors } from '../initialData';
import type { InitialData, ModelItem } from 'src/types';

type Status = 'up' | 'degraded' | 'down';

interface NodeState {
  status: Status;
}

interface DashboardState {
  nodes: Record<string, NodeState>;
  tick: number;
}

const VIEW_ID = 'view-dashboard';
const CONN_WEB_API = 'conn-web-api';
const CONN_API_DB = 'conn-api-db';

const initialDashboardState: DashboardState = {
  nodes: {
    web: { status: 'up' },
    api: { status: 'up' },
    db: { status: 'up' }
  },
  tick: 0
};

const dashboardInitialData: InitialData = {
  title: 'Live dashboard',
  description: 'A simulated 3-tier system with live status + signal pulses',
  icons,
  colors,
  items: [
    { id: 'web', name: 'Web frontend', icon: 'office' },
    { id: 'api', name: 'API service', icon: 'function-module' },
    { id: 'db', name: 'Database', icon: 'storage' }
  ],
  views: [
    {
      id: VIEW_ID,
      name: 'Dashboard',
      items: [
        { id: 'web', tile: { x: -4, y: 0 } },
        { id: 'api', tile: { x: 0, y: 0 } },
        { id: 'db', tile: { x: 4, y: 0 } }
      ],
      connectors: [
        {
          id: CONN_WEB_API,
          color: 'color2',
          anchors: [
            { id: 'a1', ref: { item: 'web' } },
            { id: 'a2', ref: { item: 'api' } }
          ],
          glyph: 'dollar',
          direction: 'START_TO_END'
        },
        {
          id: CONN_API_DB,
          color: 'color6',
          anchors: [
            { id: 'a3', ref: { item: 'api' } },
            { id: 'a4', ref: { item: 'db' } }
          ],
          glyph: 'square',
          direction: 'START_TO_END',
          animated: true
        }
      ]
    }
  ],
  view: VIEW_ID,
  fitToView: true
};

// Colour for the status pip rendered next to each node.
const statusColor: Record<Status, string> = {
  up: '#1f9d55',
  degraded: '#f59e0b',
  down: '#dc2626'
};

// `nodeIndicatorComponent` reads from this state via closure capture;
// see the LiveDashboard component below.
const renderStatusPip = (state: DashboardState, args: { item: ModelItem }) => {
  const status = state.nodes[args.item.id]?.status ?? 'up';
  return (
    <Box
      data-testid={`status-pip-${args.item.id}`}
      sx={{
        position: 'absolute',
        // Position the pip just above-right of the icon. The Node's
        // parent Box already sits at the tile origin; this offset is
        // in raw px so it floats with the icon as the user pans/zooms.
        right: -28,
        top: -68,
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: statusColor[status],
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}
      title={`${args.item.name}: ${status}`}
    />
  );
};

// Driver child rendered inside Isoflow. Uses `useIsoflow()` (only
// callable inside the Isoflow tree) to fire one-shot pulses on a
// timer. Also updates connector colour in lockstep with the
// downstream node's status so a "db down" connector turns red.
interface DriverProps {
  state: DashboardState;
  onTick: () => void;
}

const DashboardDriver = ({ state, onTick }: DriverProps) => {
  const { Connector } = useIsoflow();

  // One ticker shared across both connectors. The web→api request
  // fires every tick; the api→db request fires only if db is up.
  useEffect(() => {
    const id = window.setInterval(() => {
      onTick();
    }, 1500);
    return () => {
      window.clearInterval(id);
    };
  }, [onTick]);

  // Fire pulses + update connector colours whenever state changes.
  useEffect(() => {
    Connector.pulse(CONN_WEB_API, { durationMs: 1200 });
    if (state.nodes.db.status !== 'down') {
      Connector.pulse(CONN_API_DB, { durationMs: 1200 });
    }
    Connector.update(CONN_API_DB, {
      color: state.nodes.db.status === 'down' ? 'color4' : 'color6'
    });
    Connector.update(CONN_WEB_API, {
      color: state.nodes.api.status === 'degraded' ? 'color5' : 'color2'
    });
    // Intentionally re-fires every tick — the imperative API is
    // explicitly designed to bypass the undo stack on this path.
  }, [Connector, state]);

  return null;
};

export const LiveDashboard = () => {
  const [state, setState] = useState<DashboardState>(initialDashboardState);

  // Scripted state machine: cycles through up → degraded → down →
  // recovery so the demo shows status pips changing colour and
  // connector colours adapting.
  const advanceTick = useCallback(() => {
    setState((prev) => {
      const tick = prev.tick + 1;
      // Each cycle = 8 ticks (~12s). The api wobbles to degraded at
      // tick 3 then recovers at tick 5; the db goes down at tick 5
      // then recovers at tick 7.
      const phase = tick % 8;
      const apiStatus: Status = phase === 3 || phase === 4 ? 'degraded' : 'up';
      const dbStatus: Status = phase === 5 || phase === 6 ? 'down' : 'up';
      return {
        tick,
        nodes: {
          web: { status: 'up' },
          api: { status: apiStatus },
          db: { status: dbStatus }
        }
      };
    });
  }, []);

  // Closure-capture `state` here so the indicator function rebuilds
  // on each LiveDashboard render (when state changes), the prop
  // identity changes, Isoflow plumbs the new fn to the uiState store
  // and every Node re-renders with the up-to-date status.
  const nodeIndicatorComponent = useMemo(() => {
    return (args: { item: ModelItem }) => {
      return renderStatusPip(state, args);
    };
  }, [state]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Isoflow
        initialData={dashboardInitialData}
        enableAnimation
        editorMode="EXPLORABLE_READONLY"
        nodeIndicatorComponent={nodeIndicatorComponent}
      >
        <DashboardDriver state={state} onTick={advanceTick} />
      </Isoflow>
      <Box
        sx={(t) => {
          // FEA7-04: pull the overlay's tinted-paper bg from the
          // active theme so the panel reads above both light and
          // dark canvases. The 0.9 alpha tint is preserved.
          return {
            position: 'absolute',
            top: 16,
            left: 16,
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
          Live dashboard (FEA5-08)
        </Typography>
        <Typography variant="caption" component="div">
          tick #{state.tick} — web {state.nodes.web.status} · api{' '}
          {state.nodes.api.status} · db {state.nodes.db.status}
        </Typography>
      </Box>
    </Box>
  );
};
