import Isoflow from 'src/Isoflow';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';

export const DebugTools = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Isoflow
      initialData={{ ...initialData, fitToView: true }}
      enableDebugTools
      height="100%"
      themeMode={themeMode}
    />
  );
};
