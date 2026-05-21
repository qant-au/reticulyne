import { useCallback, useMemo } from 'react';
import {
  ModelItem,
  ViewItem,
  Connector,
  TextBox,
  Rectangle,
  ItemReference,
  LayerOrderingAction
} from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useHistoryStore } from 'src/stores/historyStore';
import * as reducers from 'src/stores/reducers';
import type { State } from 'src/stores/reducers/types';
import { generateId, getItemByIdOrThrow } from 'src/utils';
import {
  CONNECTOR_DEFAULTS,
  RECTANGLE_DEFAULTS,
  TEXTBOX_DEFAULTS
} from 'src/config';

const DUPLICATE_TILE_OFFSET = { x: 1, y: 1 };

export const useScene = () => {
  const model = useModelStore((state) => {
    return state;
  });

  const scene = useSceneStore((state) => {
    return state;
  });

  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });

  const currentView = useMemo(() => {
    return getItemByIdOrThrow(model.views, currentViewId).value;
  }, [currentViewId, model.views]);

  const items = useMemo(() => {
    return currentView.items ?? [];
  }, [currentView.items]);

  const colors = useMemo(() => {
    return model.colors;
  }, [model.colors]);

  const connectors = useMemo(() => {
    return (currentView.connectors ?? []).map((connector) => {
      const sceneConnector = scene.connectors[connector.id];

      return {
        ...CONNECTOR_DEFAULTS,
        ...connector,
        ...sceneConnector
      };
    });
  }, [currentView.connectors, scene.connectors]);

  const rectangles = useMemo(() => {
    return (currentView.rectangles ?? []).map((rectangle) => {
      return {
        ...RECTANGLE_DEFAULTS,
        ...rectangle
      };
    });
  }, [currentView.rectangles]);

  const textBoxes = useMemo(() => {
    return (currentView.textBoxes ?? []).map((textBox) => {
      const sceneTextBox = scene.textBoxes[textBox.id];

      return {
        ...TEXTBOX_DEFAULTS,
        ...textBox,
        ...sceneTextBox
      };
    });
  }, [currentView.textBoxes, scene.textBoxes]);

  const getState = useCallback(() => {
    return {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
  }, [model.actions, scene.actions]);

  const historyStore = useHistoryStore((state) => {
    return state;
  });

  // setState is the single chokepoint for every model mutation, so
  // this is where FEA5-03 records the prior state into the undo
  // stack. While undo/redo are restoring a saved snapshot, the
  // history store flips `isApplying` so this guard skips the
  // record — otherwise undo would push the state we're trying to
  // undo BACK onto the past stack.
  const setState = useCallback(
    (newState: State) => {
      if (!historyStore.isApplying) {
        historyStore.actions.recordPriorState({
          model: model.actions.get(),
          scene: scene.actions.get()
        });
      }
      model.actions.set(newState.model);
      scene.actions.set(newState.scene);
    },
    [
      model.actions,
      scene.actions,
      historyStore.isApplying,
      historyStore.actions
    ]
  );

  const undo = useCallback(() => {
    const current: State = {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
    const priorState = historyStore.actions.undo(current);
    if (priorState === null) return;
    historyStore.actions.setIsApplying(true);
    try {
      model.actions.set(priorState.model);
      scene.actions.set(priorState.scene);
    } finally {
      historyStore.actions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyStore.actions]);

  const redo = useCallback(() => {
    const current: State = {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
    const nextState = historyStore.actions.redo(current);
    if (nextState === null) return;
    historyStore.actions.setIsApplying(true);
    try {
      model.actions.set(nextState.model);
      scene.actions.set(nextState.scene);
    } finally {
      historyStore.actions.setIsApplying(false);
    }
  }, [model.actions, scene.actions, historyStore.actions]);

  const createModelItem = useCallback(
    (newModelItem: ModelItem) => {
      const newState = reducers.createModelItem(newModelItem, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const updateModelItem = useCallback(
    (id: string, updates: Partial<ModelItem>) => {
      const newState = reducers.updateModelItem(id, updates, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const deleteModelItem = useCallback(
    (id: string) => {
      const newState = reducers.deleteModelItem(id, getState());
      setState(newState);
    },
    [getState, setState]
  );

  const createViewItem = useCallback(
    (newViewItem: ViewItem) => {
      const newState = reducers.view({
        action: 'CREATE_VIEWITEM',
        payload: newViewItem,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateViewItem = useCallback(
    (id: string, updates: Partial<ViewItem>) => {
      const newState = reducers.view({
        action: 'UPDATE_VIEWITEM',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteViewItem = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_VIEWITEM',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

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
      // useIsoflow) pass recordHistory: false so a live-data poller
      // hitting this 5x/second doesn't fill the undo stack. Editor
      // UI changes leave the flag unset and remain undoable. Reuses
      // the same isApplying flag the undo/redo path uses (see
      // setState above) so the recordPriorState guard short-circuits.
      const skipHistory = opts?.recordHistory === false;
      if (skipHistory) {
        historyStore.actions.setIsApplying(true);
        try {
          setState(newState);
        } finally {
          historyStore.actions.setIsApplying(false);
        }
        return;
      }
      setState(newState);
    },
    [getState, setState, currentViewId, historyStore.actions]
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
  // into the undo stack (writes go through scene.actions.set
  // directly, bypassing the model-mutation `setState` chokepoint
  // that wires through historyStore). Auto-clears via setTimeout
  // so a poller calling this repeatedly always re-triggers cleanly.
  const pulseConnector = useCallback(
    (id: string, opts?: { durationMs?: number; glyph?: string }) => {
      const durationMs = opts?.durationMs ?? 1500;
      const expiresAt = Date.now() + durationMs;
      const current = scene.actions.get();
      scene.actions.set({
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
        const next = scene.actions.get();
        const overlay = next.connectorOverlays[id];
        // Only clear if THIS pulse is the one still active — a fresh
        // pulse triggered before this timeout fires updates
        // pulseExpiresAt to a later value and should not be cleared
        // by an older timeout.
        if (overlay?.pulseExpiresAt === expiresAt) {
          const rest = { ...next.connectorOverlays };
          delete rest[id];
          scene.actions.set({ connectorOverlays: rest });
        }
      }, durationMs);
    },
    [scene.actions]
  );

  const createTextBox = useCallback(
    (newTextBox: TextBox) => {
      const newState = reducers.view({
        action: 'CREATE_TEXTBOX',
        payload: newTextBox,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateTextBox = useCallback(
    (id: string, updates: Partial<TextBox>) => {
      const newState = reducers.view({
        action: 'UPDATE_TEXTBOX',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteTextBox = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_TEXTBOX',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const createRectangle = useCallback(
    (newRectangle: Rectangle) => {
      const newState = reducers.view({
        action: 'CREATE_RECTANGLE',
        payload: newRectangle,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const updateRectangle = useCallback(
    (id: string, updates: Partial<Rectangle>) => {
      const newState = reducers.view({
        action: 'UPDATE_RECTANGLE',
        payload: { id, ...updates },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const deleteRectangle = useCallback(
    (id: string) => {
      const newState = reducers.view({
        action: 'DELETE_RECTANGLE',
        payload: id,
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  const changeLayerOrder = useCallback(
    (action: LayerOrderingAction, item: ItemReference) => {
      const newState = reducers.view({
        action: 'CHANGE_LAYER_ORDER',
        payload: { action, item },
        ctx: { viewId: currentViewId, state: getState() }
      });
      setState(newState);
    },
    [getState, setState, currentViewId]
  );

  // Deep-clone the target item with a freshly-generated id and a small
  // tile offset so the copy doesn't sit exactly on top of the original.
  // Connectors are deliberately not duplicated yet — their anchors
  // reference other items and the right semantics for "duplicate a
  // connector pointing at the original anchors vs the copies" needs a
  // UX decision.
  const duplicateItem = useCallback(
    (target: ItemReference) => {
      const state = getState();
      switch (target.type) {
        case 'ITEM': {
          const modelItem = getItemByIdOrThrow(state.model.items, target.id);
          const viewItem = getItemByIdOrThrow(
            currentView.items ?? [],
            target.id
          );
          const newId = generateId();
          const afterModel = reducers.createModelItem(
            {
              ...modelItem.value,
              id: newId,
              name: `${modelItem.value.name} (copy)`
            },
            state
          );
          const afterView = reducers.view({
            action: 'CREATE_VIEWITEM',
            payload: {
              ...viewItem.value,
              id: newId,
              tile: {
                x: viewItem.value.tile.x + DUPLICATE_TILE_OFFSET.x,
                y: viewItem.value.tile.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state: afterModel }
          });
          setState(afterView);
          return;
        }
        case 'TEXTBOX': {
          const textBox = getItemByIdOrThrow(
            currentView.textBoxes ?? [],
            target.id
          );
          const newState = reducers.view({
            action: 'CREATE_TEXTBOX',
            payload: {
              ...textBox.value,
              id: generateId(),
              tile: {
                x: textBox.value.tile.x + DUPLICATE_TILE_OFFSET.x,
                y: textBox.value.tile.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state }
          });
          setState(newState);
          return;
        }
        case 'RECTANGLE': {
          const rectangle = getItemByIdOrThrow(
            currentView.rectangles ?? [],
            target.id
          );
          const newState = reducers.view({
            action: 'CREATE_RECTANGLE',
            payload: {
              ...rectangle.value,
              id: generateId(),
              from: {
                x: rectangle.value.from.x + DUPLICATE_TILE_OFFSET.x,
                y: rectangle.value.from.y + DUPLICATE_TILE_OFFSET.y
              },
              to: {
                x: rectangle.value.to.x + DUPLICATE_TILE_OFFSET.x,
                y: rectangle.value.to.y + DUPLICATE_TILE_OFFSET.y
              }
            },
            ctx: { viewId: currentViewId, state }
          });
          setState(newState);
          return;
        }
        default:
          // CONNECTOR / CONNECTOR_ANCHOR: not supported (see comment above).
          break;
      }
    },
    [getState, setState, currentViewId, currentView]
  );

  // FEA5-04: copy/paste. Copy reads the selection's data from the
  // live stores and snapshots it into the clipboard slice on
  // uiStateStore. Paste deep-clones the clipboard entry with a
  // fresh id and a one-tile offset, then commits through setState
  // — which means paste is automatically captured by the FEA5-03
  // undo/redo history.
  //
  // Connectors are deliberately not copyable: their anchors
  // reference other items by id, and the right "paste a connector
  // into a context where its anchored items may or may not exist"
  // semantics isn't a UX call we want to lock in yet. Matches
  // duplicateItem's existing exclusion.
  const setClipboard = useUiStateStore((state) => {
    return state.actions.setClipboard;
  });
  const clipboard = useUiStateStore((state) => {
    return state.clipboard;
  });

  const copySelection = useCallback(
    (target: ItemReference) => {
      const state = getState();
      switch (target.type) {
        case 'ITEM': {
          const modelItem = getItemByIdOrThrow(
            state.model.items,
            target.id
          ).value;
          const viewItem = getItemByIdOrThrow(
            currentView.items ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'ITEM', modelItem, viewItem });
          return;
        }
        case 'TEXTBOX': {
          const textBox = getItemByIdOrThrow(
            currentView.textBoxes ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'TEXTBOX', textBox });
          return;
        }
        case 'RECTANGLE': {
          const rectangle = getItemByIdOrThrow(
            currentView.rectangles ?? [],
            target.id
          ).value;
          setClipboard({ kind: 'RECTANGLE', rectangle });
          return;
        }
        default:
          // CONNECTOR is intentionally not copyable.
          break;
      }
    },
    [getState, currentView, setClipboard]
  );

  const paste = useCallback(() => {
    if (clipboard === null) return null;
    const state = getState();
    const newId = generateId();
    switch (clipboard.kind) {
      case 'ITEM': {
        const afterModel = reducers.createModelItem(
          {
            ...clipboard.modelItem,
            id: newId,
            name: `${clipboard.modelItem.name} (copy)`
          },
          state
        );
        const afterView = reducers.view({
          action: 'CREATE_VIEWITEM',
          payload: {
            ...clipboard.viewItem,
            id: newId,
            tile: {
              x: clipboard.viewItem.tile.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.viewItem.tile.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state: afterModel }
        });
        setState(afterView);
        return { type: 'ITEM' as const, id: newId };
      }
      case 'TEXTBOX': {
        const newState = reducers.view({
          action: 'CREATE_TEXTBOX',
          payload: {
            ...clipboard.textBox,
            id: newId,
            tile: {
              x: clipboard.textBox.tile.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.textBox.tile.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state }
        });
        setState(newState);
        return { type: 'TEXTBOX' as const, id: newId };
      }
      case 'RECTANGLE': {
        const newState = reducers.view({
          action: 'CREATE_RECTANGLE',
          payload: {
            ...clipboard.rectangle,
            id: newId,
            from: {
              x: clipboard.rectangle.from.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.rectangle.from.y + DUPLICATE_TILE_OFFSET.y
            },
            to: {
              x: clipboard.rectangle.to.x + DUPLICATE_TILE_OFFSET.x,
              y: clipboard.rectangle.to.y + DUPLICATE_TILE_OFFSET.y
            }
          },
          ctx: { viewId: currentViewId, state }
        });
        setState(newState);
        return { type: 'RECTANGLE' as const, id: newId };
      }
      default:
        return null;
    }
  }, [clipboard, getState, setState, currentViewId]);

  return {
    items,
    connectors,
    colors,
    rectangles,
    textBoxes,
    currentView,
    createModelItem,
    updateModelItem,
    deleteModelItem,
    createViewItem,
    updateViewItem,
    deleteViewItem,
    createConnector,
    updateConnector,
    deleteConnector,
    pulseConnector,
    createTextBox,
    updateTextBox,
    deleteTextBox,
    createRectangle,
    updateRectangle,
    deleteRectangle,
    changeLayerOrder,
    duplicateItem,
    copySelection,
    paste,
    undo,
    redo
  };
};
