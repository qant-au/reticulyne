import Reticulyne from 'src/Reticulyne';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';

export const BasicEditor = () => {
  const { themeMode } = useExamplesThemeMode();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      themeMode={themeMode}
    />
  );
};
