// FEA7-04 demo glue: the examples picker (dev/demo bundle, port 2223)
// drives `themeMode` from a sidebar toggle. Each example reads the
// resolved value via `useExamplesThemeMode()` and passes it to its
// own <Reticulyne>. Lives in the examples tree so it doesn't ship with
// the library bundle.
import { createContext, useContext, useState, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeModeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: 'light',
  setThemeMode: () => {}
});

export const useExamplesThemeMode = () => {
  return useContext(ThemeModeContext);
};

export const ExamplesThemeModeProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  return (
    <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
};
