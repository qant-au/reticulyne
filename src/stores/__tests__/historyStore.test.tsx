/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { HistoryProvider, useHistoryStore } from '../historyStore';
import type { State } from '../reducers/types';
import type { Model, Scene } from 'src/types';

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

// Minimal State stub — the history store treats State as opaque, so
// we don't need real models. A tag string lets each snapshot be
// distinguished in assertions.
const makeState = (tag: string): State => {
  return {
    model: { tag } as unknown as Model,
    scene: { tag } as unknown as Scene
  };
};

// The full store snapshot — what useHistoryStore((s) => s) returns.
// Typing the captured value explicitly because TypeScript can't
// narrow ReturnType<typeof useHistoryStore> (it's a generic hook).
type Captured = {
  past: ReadonlyArray<State>;
  future: ReadonlyArray<State>;
  pendingPrior: State | null;
  commitTimer: ReturnType<typeof setTimeout> | null;
  isApplying: boolean;
  actions: {
    recordPriorState: (prior: State) => void;
    flushPending: () => void;
    undo: (current: State) => State | null;
    redo: (current: State) => State | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clear: () => void;
    setIsApplying: (v: boolean) => void;
  };
};

const Harness = ({ onReady }: { onReady: (s: Captured) => void }) => {
  const store = useHistoryStore((state) => {
    return state;
  });
  useEffect(() => {
    onReady(store);
  });
  return null;
};

const setup = (): { current: Captured } => {
  const ref: { current: Captured | null } = { current: null };
  act(() => {
    render(
      <HistoryProvider>
        <Harness
          onReady={(s) => {
            ref.current = s;
          }}
        />
      </HistoryProvider>
    );
  });
  if (ref.current === null) throw new Error('harness did not capture');
  return ref as { current: Captured };
};

describe('historyStore', () => {
  describe('recordPriorState + debounce', () => {
    test('a single mutation pushes onto past after the debounce fires', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      // Before the timer fires, the entry is pending — past is empty.
      expect(s.current.past).toHaveLength(0);
      expect(s.current.pendingPrior).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(s.current.past).toHaveLength(1);
      expect((s.current.past[0].model as unknown as { tag: string }).tag).toBe(
        'A'
      );
      expect(s.current.pendingPrior).toBeNull();
    });

    test('rapid bursts of mutations collapse into one history entry', () => {
      jest.useFakeTimers();
      const s = setup();
      // Three calls within the debounce window.
      act(() => {
        s.current.actions.recordPriorState(makeState('pre-drag'));
        s.current.actions.recordPriorState(makeState('drag-mid-1'));
        s.current.actions.recordPriorState(makeState('drag-mid-2'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      // Only the FIRST state is kept — that's the pre-burst snapshot.
      expect(s.current.past).toHaveLength(1);
      expect((s.current.past[0].model as unknown as { tag: string }).tag).toBe(
        'pre-drag'
      );
    });

    test('two committed bursts produce two history entries', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      act(() => {
        s.current.actions.recordPriorState(makeState('B'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(s.current.past).toHaveLength(2);
      expect((s.current.past[0].model as unknown as { tag: string }).tag).toBe(
        'A'
      );
      expect((s.current.past[1].model as unknown as { tag: string }).tag).toBe(
        'B'
      );
    });
  });

  describe('undo / redo', () => {
    test('undo pops past, pushes current onto future, returns popped', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      // Now past has [A], future has [].
      let popped: State | null = null;
      act(() => {
        popped = s.current.actions.undo(makeState('current'));
      });
      expect((popped!.model as unknown as { tag: string }).tag).toBe('A');
      expect(s.current.past).toHaveLength(0);
      expect(s.current.future).toHaveLength(1);
      expect(
        (s.current.future[0].model as unknown as { tag: string }).tag
      ).toBe('current');
    });

    test('redo pops future, pushes current onto past, returns popped', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      act(() => {
        s.current.actions.undo(makeState('B'));
      });
      // past=[], future=[B]
      let popped: State | null = null;
      act(() => {
        popped = s.current.actions.redo(makeState('A'));
      });
      expect((popped!.model as unknown as { tag: string }).tag).toBe('B');
      expect(s.current.future).toHaveLength(0);
      expect(s.current.past).toHaveLength(1);
    });

    test('undo flushes any pending burst first', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
        // Don't let the timer fire — call undo synchronously instead.
      });
      // pendingPrior is set but past is still empty.
      expect(s.current.past).toHaveLength(0);
      expect(s.current.pendingPrior).not.toBeNull();
      let popped: State | null = null;
      act(() => {
        popped = s.current.actions.undo(makeState('current'));
      });
      // undo flushed the pending entry first, then popped it.
      expect((popped!.model as unknown as { tag: string }).tag).toBe('A');
    });

    test('undo on empty past returns null without mutating', () => {
      const s = setup();
      let popped: State | null = makeState('not-null');
      act(() => {
        popped = s.current.actions.undo(makeState('current'));
      });
      expect(popped).toBeNull();
      expect(s.current.past).toHaveLength(0);
      expect(s.current.future).toHaveLength(0);
    });

    test('a new committed action wipes the redo stack', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      act(() => {
        s.current.actions.undo(makeState('B'));
      });
      // future = [B], past = []
      expect(s.current.future).toHaveLength(1);
      act(() => {
        s.current.actions.recordPriorState(makeState('C'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      // future has been cleared by the new commit.
      expect(s.current.future).toHaveLength(0);
      expect(s.current.past).toHaveLength(1);
    });
  });

  describe('canUndo / canRedo', () => {
    test('canUndo reflects past + pendingPrior', () => {
      jest.useFakeTimers();
      const s = setup();
      expect(s.current.actions.canUndo()).toBe(false);
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      // pendingPrior is set, so canUndo() is true even before the
      // debounce flushes — undo() will flush implicitly.
      expect(s.current.actions.canUndo()).toBe(true);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(s.current.actions.canUndo()).toBe(true);
    });

    test('canRedo reflects future only', () => {
      jest.useFakeTimers();
      const s = setup();
      expect(s.current.actions.canRedo()).toBe(false);
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(s.current.actions.canRedo()).toBe(false);
      act(() => {
        s.current.actions.undo(makeState('B'));
      });
      expect(s.current.actions.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    test('wipes both stacks and the pending entry', () => {
      jest.useFakeTimers();
      const s = setup();
      act(() => {
        s.current.actions.recordPriorState(makeState('A'));
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      act(() => {
        s.current.actions.undo(makeState('B'));
      });
      // past=[], future=[B]
      act(() => {
        s.current.actions.recordPriorState(makeState('pending'));
      });
      expect(s.current.pendingPrior).not.toBeNull();
      act(() => {
        s.current.actions.clear();
      });
      expect(s.current.past).toHaveLength(0);
      expect(s.current.future).toHaveLength(0);
      expect(s.current.pendingPrior).toBeNull();
      expect(s.current.commitTimer).toBeNull();
    });
  });
});
