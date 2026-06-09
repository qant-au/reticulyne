import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';
type ResolvedMode = 'light' | 'dark';

// FEA7-04: resolve the host's `themeMode` prop to a concrete
// 'light' | 'dark' value. For 'auto', subscribe to the
// `prefers-color-scheme: dark` media query so the resolved mode
// updates live when the user toggles their OS theme.
//
// SSR / non-browser safety: `window.matchMedia` is consulted
// defensively. When unavailable (Node, test environments without
// matchMedia stubbed) the initial value is 'light' and no
// subscription is created.
const readPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useResolvedThemeMode = (themeMode: ThemeMode): ResolvedMode => {
  const [prefersDark, setPrefersDark] = useState<boolean>(readPrefersDark);

  useEffect(() => {
    if (themeMode !== 'auto') return;
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    // The older `addListener`/`removeListener` API was removed in
    // most browsers but Safari < 14 still requires it; using the
    // modern signature is fine for everything Reticulyne's peer-deps
    // matrix supports (React 19 + MUI 9). Initial value was read
    // via `useState(readPrefersDark)` so no immediate setState is
    // needed here — the listener catches every subsequent change.
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [themeMode]);

  if (themeMode === 'light' || themeMode === 'dark') return themeMode;
  return prefersDark ? 'dark' : 'light';
};
