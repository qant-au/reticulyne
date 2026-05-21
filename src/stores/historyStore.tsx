// History store for undo/redo (FEA5-03).
//
// The history is a pair of LIFO stacks holding immutable `State`
// snapshots (`{ model, scene }`). Every model mutation that flows
// through useScene.setState records the PRIOR state into `past`
// before applying the new state. Rapid bursts of mutations within
// the COMMIT_DEBOUNCE window are collapsed into one history entry
// so a single drag (which emits a snapshot per mousemove) becomes
// one undo step.
//
// Snapshots are safe to keep by reference because every reducer
// produces a fresh immer-immutable State — the next mutation can't
// mutate a saved past entry.
//
// UI state (selection, mode, scroll, zoom, clipboard) is NOT part
// of history. Only document-shape mutations are undoable, matching
// the convention every other canvas editor uses.

import { createStore } from 'zustand';
import type { State } from 'src/stores/reducers/types';
import { createContextualStore } from './createContextualStore';

// 250ms balances "I just released the mouse, undo should step the
// whole drag back" vs "I made two quick edits, each should be its
// own undo step." Aligns with how most desktop editors batch.
const COMMIT_DEBOUNCE_MS = 250;

// Cap the stack so a long editing session doesn't accumulate
// unbounded memory. 100 entries × ~10KB per snapshot is ~1MB, a
// reasonable upper bound.
const HISTORY_DEPTH = 100;

interface HistoryStore {
  past: State[];
  future: State[];
  // The state captured at the START of the current burst, waiting
  // for the debounce timer to fire and commit it to `past`.
  pendingPrior: State | null;
  // Active debounce timer id; null when no burst in flight.
  commitTimer: ReturnType<typeof setTimeout> | null;
  // Guards against recursive recording: while undo()/redo() are
  // restoring a saved state, the resulting setState call must not
  // record itself as a new history entry.
  isApplying: boolean;
  actions: {
    /**
     * Called by useScene.setState right BEFORE applying a new
     * mutation. Captures the prior state on first call of a burst;
     * subsequent calls within COMMIT_DEBOUNCE_MS extend the burst.
     */
    recordPriorState: (prior: State) => void;
    /** Forces any pending burst to flush immediately. */
    flushPending: () => void;
    /**
     * Pops the most recent entry off `past`, pushes current onto
     * `future`, returns the popped state for the caller to apply.
     * Returns null if there's nothing to undo.
     */
    undo: (current: State) => State | null;
    /** Mirror of undo. */
    redo: (current: State) => State | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    /** Wipes both stacks. Called on diagram load / clear. */
    clear: () => void;
    /** Lets useScene flip the recursion guard around an apply. */
    setIsApplying: (v: boolean) => void;
  };
}

const { Provider, useStore } = createContextualStore<HistoryStore>(() => {
  return createStore<HistoryStore>((set, get) => {
    return {
      past: [],
      future: [],
      pendingPrior: null,
      commitTimer: null,
      isApplying: false,
      actions: {
        recordPriorState: (prior) => {
          const { pendingPrior, commitTimer } = get();
          // First mutation of a burst — remember the pre-burst
          // state. Subsequent mutations within the debounce window
          // are no-ops for recording; the burst's history entry
          // will be this first prior.
          if (pendingPrior === null) {
            set({ pendingPrior: prior });
          }
          // Reset the debounce timer on every mutation so the
          // burst is defined as "no mutations for 250ms."
          if (commitTimer !== null) clearTimeout(commitTimer);
          const newTimer = setTimeout(() => {
            const s = get();
            if (s.pendingPrior === null) return;
            const nextPast = [...s.past, s.pendingPrior];
            // Cap depth — drop oldest entries.
            const trimmed =
              nextPast.length > HISTORY_DEPTH
                ? nextPast.slice(nextPast.length - HISTORY_DEPTH)
                : nextPast;
            set({
              past: trimmed,
              future: [], // a new committed action invalidates redo
              pendingPrior: null,
              commitTimer: null
            });
          }, COMMIT_DEBOUNCE_MS);
          set({ commitTimer: newTimer });
        },
        flushPending: () => {
          const { pendingPrior, commitTimer, past } = get();
          if (commitTimer !== null) {
            clearTimeout(commitTimer);
          }
          if (pendingPrior === null) {
            set({ commitTimer: null });
            return;
          }
          const nextPast = [...past, pendingPrior];
          const trimmed =
            nextPast.length > HISTORY_DEPTH
              ? nextPast.slice(nextPast.length - HISTORY_DEPTH)
              : nextPast;
          set({
            past: trimmed,
            future: [],
            pendingPrior: null,
            commitTimer: null
          });
        },
        undo: (current) => {
          // Flush any pending burst so the burst-start state is
          // available to pop.
          get().actions.flushPending();
          const { past, future } = get();
          if (past.length === 0) return null;
          const popped = past[past.length - 1];
          set({
            past: past.slice(0, past.length - 1),
            future: [...future, current]
          });
          return popped;
        },
        redo: (current) => {
          get().actions.flushPending();
          const { past, future } = get();
          if (future.length === 0) return null;
          const popped = future[future.length - 1];
          set({
            future: future.slice(0, future.length - 1),
            past: [...past, current]
          });
          return popped;
        },
        canUndo: () => {
          const { past, pendingPrior } = get();
          return past.length > 0 || pendingPrior !== null;
        },
        canRedo: () => {
          return get().future.length > 0;
        },
        clear: () => {
          const { commitTimer } = get();
          if (commitTimer !== null) clearTimeout(commitTimer);
          set({
            past: [],
            future: [],
            pendingPrior: null,
            commitTimer: null
          });
        },
        setIsApplying: (v) => {
          set({ isApplying: v });
        }
      }
    };
  });
}, 'History');

export const HistoryProvider = Provider;
export const useHistoryStore = useStore;
