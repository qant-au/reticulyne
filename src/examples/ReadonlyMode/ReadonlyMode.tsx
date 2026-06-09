import Reticulyne from 'src/Reticulyne';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';

export const ReadonlyMode = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      editorMode="EXPLORABLE_READONLY"
      themeMode={themeMode}
    />
  );
};
