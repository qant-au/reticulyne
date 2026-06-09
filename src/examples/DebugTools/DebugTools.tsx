import Reticulyne from 'src/Reticulyne';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';

export const DebugTools = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      enableDebugTools
      height="100%"
      themeMode={themeMode}
    />
  );
};
