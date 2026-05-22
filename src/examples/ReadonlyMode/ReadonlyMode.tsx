import Isoflow from 'src/Isoflow';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';

export const ReadonlyMode = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Isoflow
      initialData={{ ...initialData, fitToView: true }}
      editorMode="EXPLORABLE_READONLY"
      themeMode={themeMode}
    />
  );
};
