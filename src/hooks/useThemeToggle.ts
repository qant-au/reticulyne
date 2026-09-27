import { createContext, useContext } from 'react';

// UXA-08: the in-app light/dark toggle (Alt+Shift+D, as in Excalidraw).
// The theme is resolved in the outer <Reticulyne>, above the store
// providers, so the toggle reaches the keyboard handler through this
// context rather than the UI store. Outside a <Reticulyne> it is a no-op.
export const ThemeToggleContext = createContext<() => void>(() => {});

export const useThemeToggle = () => {
  return useContext(ThemeToggleContext);
};
