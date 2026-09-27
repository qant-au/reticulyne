import { useCallback } from 'react';
import { Connector } from 'src/types';
import * as reducers from 'src/stores/reducers';
import type { SceneCore } from './types';

// Connector CRUD plus the runtime-only pulse overlay.
export const useSceneConnectors = ({
  getState,
  setState,
  currentViewId,
  historyActions,
  sceneActions
}: Pick<
  SceneCore,
  'getState' | 'setState' | 'currentViewId' | 'historyActions' | 'sceneActions'
>) => {
  const createConnector = useCallback(
    (newConnector: Connector) => {
      const newState = reducers.view({
        action: 'CREATE_CONNECTOR',
        payload: newConnector,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateConnector = useCallback(
    (
      id: string,
      updates: Partial<Connector>,
      opts?: { recordHistory?: boolean }
    ) => {
      const newState = reducers.view({
        action: 'UPDATE_CONNECTOR',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      // FEA5-07: host-driven imperative updates (Connector.update via
      // useReticulyne) pass recordHistory: false so a live-data poller
      // hitting this 5x/second doesn't fill the undo stack. Editor
      // UI changes leave the flag unset and remain undoable. Reuses
      // the same isApplying flag the undo/redo path uses (see
      // setState above) so the recordPriorState guard short-circuits.
      const skipHistory = opts?.recordHistory === false;
      if (skipHistory) {
        historyActions.setIsApplying(true);
        try {
          setState(newState);
        } finally {
          historyActions.setIsApplying(false);
        }
        return;
      }
      setState(newState);
    },
    [getState, setState, currentViewId, historyActions]
  );

  const deleteConnector = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_CONNECTOR',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  // FEA5-07: write a transient pulse marker into the per-connector
  // scene overlay. Runtime-only — never persisted, never recorded
  // into the undo stack (writes go through sceneActions.set
  // directly, bypassing the model-mutation `setState` chokepoint
  // that wires through historyStore). Auto-clears via setTimeout
  // so a poller calling this repeatedly always re-triggers cleanly.
  const pulseConnector = useCallback(
    (id: string, opts?: { durationMs?: number; glyph?: string }) => {
      const durationMs = opts?.durationMs ?? 1500;
      const expiresAt = Date.now() + durationMs;
      const current = sceneActions.get();
      sceneActions.set({
        connectorOverlays: {
          ...current.connectorOverlays,
          [id]: {
            pulseExpiresAt: expiresAt,
            pulseDurationMs: durationMs,
            pulseGlyph: opts?.glyph
          }
        }
      });
      setTimeout(() => {
        const next = sceneActions.get();
        const overlay = next.connectorOverlays[id];
        // Only clear if THIS pulse is the one still active — a fresh
        // pulse triggered before this timeout fires updates
        // pulseExpiresAt to a later value and should not be cleared
        // by an older timeout.
        if (overlay?.pulseExpiresAt === expiresAt) {
          const rest = { ...next.connectorOverlays };
          delete rest[id];
          sceneActions.set({ connectorOverlays: rest });
        }
      }, durationMs);
    },
    [sceneActions]
  );

  return {
    createConnector,
    updateConnector,
    deleteConnector,
    pulseConnector
  };
};
