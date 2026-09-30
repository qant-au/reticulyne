// Demo glue: Main menu > Open with a file that is not a diagram went only to
// the console here, while the editor build shows a red alert. Each example
// passes `useExamplesValidationError()` as its <Reticulyne>'s
// onValidationError; the picker shows the message. Lives in the examples
// tree so it doesn't ship with the library bundle.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode
} from 'react';
import { Alert } from '@mui/material';
import type { ZodIssue } from 'zod';
import type { ValidationErrorHandler } from 'src/types';

interface OpenErrorContextValue {
  error: string | null;
  onValidationError: ValidationErrorHandler;
  clear: () => void;
}

const OpenErrorContext = createContext<OpenErrorContextValue>({
  error: null,
  onValidationError: () => {},
  clear: () => {}
});

/**
 * The same wording as the editor build's (DiagramShell): the file is named
 * when Open said which it was.
 */
export const openErrorMessage = (issues: ZodIssue[], fileName?: string) => {
  // useImportFile reports a file that does not parse with this issue.
  const notJson = issues.some((issue) => {
    return issue.message === 'Imported file is not valid JSON';
  });
  const file = fileName ? `“${fileName}”` : 'That file';
  return notJson
    ? `${file} is not a diagram file (it is not valid JSON).`
    : `${file} is not a valid diagram.`;
};

/** The onValidationError each example hands its <Reticulyne>. */
export const useExamplesValidationError = () => {
  return useContext(OpenErrorContext).onValidationError;
};

export const ExamplesOpenErrorProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const [error, setError] = useState<string | null>(null);
  const onValidationError = useCallback(
    (issues: ZodIssue[], context?: { fileName?: string }) => {
      setError(openErrorMessage(issues, context?.fileName));
    },
    []
  );
  const clear = useCallback(() => {
    setError(null);
  }, []);
  const value = useMemo(() => {
    return { error, onValidationError, clear };
  }, [error, onValidationError, clear]);
  return (
    <OpenErrorContext.Provider value={value}>
      {children}
    </OpenErrorContext.Provider>
  );
};

/** The message, top centre over the example, until it is closed. */
export const ExamplesOpenErrorAlert = () => {
  const { error, clear } = useContext(OpenErrorContext);
  if (!error) return null;
  return (
    <Alert
      severity="error"
      onClose={clear}
      sx={{
        position: 'fixed',
        top: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1300,
        width: 'max-content',
        maxWidth: 'min(420px, calc(100vw - 32px))'
      }}
    >
      {error}
    </Alert>
  );
};
