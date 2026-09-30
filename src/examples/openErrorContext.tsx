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

interface OpenErrorContextValue {
  error: string | null;
  onValidationError: (issues: ZodIssue[]) => void;
  clear: () => void;
}

const OpenErrorContext = createContext<OpenErrorContextValue>({
  error: null,
  onValidationError: () => {},
  clear: () => {}
});

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
  const onValidationError = useCallback((issues: ZodIssue[]) => {
    // useImportFile reports a file that does not parse with this issue.
    const notJson = issues.some((issue) => {
      return issue.message === 'Imported file is not valid JSON';
    });
    setError(
      notJson
        ? 'That file is not a diagram file (it is not valid JSON).'
        : 'That file is not a valid diagram.'
    );
  }, []);
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
