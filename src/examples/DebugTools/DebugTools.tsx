import Reticulyne from 'src/Reticulyne';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';
import { useExamplesValidationError } from '../openErrorContext';

export const DebugTools = () => {
  const { themeMode } = useExamplesThemeMode();
  const onValidationError = useExamplesValidationError();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      enableDebugTools
      height="100%"
      themeMode={themeMode}
      onValidationError={onValidationError}
    />
  );
};
