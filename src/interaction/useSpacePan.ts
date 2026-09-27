import { useEffect, useRef } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { Mode } from 'src/types';

// UXA-02: hold Space to pan, release to go back to whatever tool you were
// in, as in Excalidraw. A transient overlay: the previous mode is kept
// and restored on key-up (or when the window loses focus mid-hold, which
// would otherwise swallow the key-up and strand the user in Pan).
//
// Only from a resting state: not while a button is held (mid-drag or
// mid-draw), and not over a text field, where Space is a space.
const isTextTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
};

export const useSpacePan = (enableGlobalKeyboardShortcuts = true) => {
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const mousedown = useUiStateStore((state) => {
    return state.mouse.mousedown;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const live = useRef({ mode, mousedown });
  useEffect(() => {
    live.current = { mode, mousedown };
  }, [mode, mousedown]);
  const previous = useRef<Mode | null>(null);

  useEffect(() => {
    const target: EventTarget | null = enableGlobalKeyboardShortcuts
      ? window
      : rendererEl;
    if (!target) return undefined;

    const restore = () => {
      const prev = previous.current;
      if (!prev) return;
      previous.current = null;
      // A cursor mode resumes clean; a stale mousedownItem would turn
      // the next move into a drag.
      uiStateActions.setMode(
        prev.type === 'CURSOR' ? { ...prev, mousedownItem: null } : prev
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTextTarget(e.target)) return;
      // Stop the page scrolling while the key is held, repeats included.
      e.preventDefault();
      if (e.repeat || previous.current) return;
      const { mode: current, mousedown: held } = live.current;
      if (current.type === 'PAN' || held) return;
      previous.current = current;
      uiStateActions.setMode({ type: 'PAN', showCursor: false });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      restore();
    };

    target.addEventListener('keydown', onKeyDown as EventListener);
    target.addEventListener('keyup', onKeyUp as EventListener);
    window.addEventListener('blur', restore);
    return () => {
      target.removeEventListener('keydown', onKeyDown as EventListener);
      target.removeEventListener('keyup', onKeyUp as EventListener);
      window.removeEventListener('blur', restore);
    };
  }, [enableGlobalKeyboardShortcuts, rendererEl, uiStateActions]);
};
