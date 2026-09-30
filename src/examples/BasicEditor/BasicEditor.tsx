import Reticulyne from 'src/Reticulyne';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';
import { useExamplesValidationError } from '../openErrorContext';

export const BasicEditor = () => {
  const { themeMode } = useExamplesThemeMode();
  const onValidationError = useExamplesValidationError();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      themeMode={themeMode}
      onValidationError={onValidationError}
    />
  );
};
