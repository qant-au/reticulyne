import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { AppDialog } from 'src/kit';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { mermaidToScene } from 'src/mermaid';
import { formatIssue, type MermaidIssue } from 'src/mermaid/issues';
import { MAX_TEXT_LENGTH } from 'src/mermaid/parse';

/** A file larger than this is refused before it is read into the box. */
const MAX_FILE_BYTES = MAX_TEXT_LENGTH * 4;

/** Where line `line`, column `column` (both 1-based) falls in `text`. */
export const offsetOf = (text: string, line: number, column: number) => {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < Math.min(line - 1, lines.length); i += 1) {
    offset += lines[i].length + 1;
  }
  return Math.min(text.length, offset + Math.max(0, column - 1));
};

// Import Mermaid: paste a flowchart or open a .mmd / .md file. It is read
// as it is typed, and every problem is listed at its line and column;
// choosing one puts the cursor there. Import stays off until there are no
// errors, then the flowchart replaces the diagram, laid out on tiles.
export const ImportMermaidDialog = ({ onClose }: { onClose: () => void }) => {
  const [text, setText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const deferred = useDeferredValue(text);
  const textArea = useRef<HTMLTextAreaElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { load } = useInitialDataManager();

  const result = useMemo(() => {
    return deferred.trim() ? mermaidToScene(deferred) : null;
  }, [deferred]);
  const errors =
    result?.issues.filter((i) => {
      return i.severity === 'error';
    }) ?? [];
  const warnings =
    result?.issues.filter((i) => {
      return i.severity === 'warning';
    }) ?? [];
  const ready = !!result?.scene && deferred === text;

  const goTo = (issue: MermaidIssue) => {
    const area = textArea.current;
    if (!area || issue.line === undefined) return;
    const at = offsetOf(text, issue.line, issue.column ?? 1);
    area.focus();
    area.setSelectionRange(at, at + Math.max(1, issue.excerpt?.length ?? 1));
  };

  const openFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        `“${file.name}” is ${Math.round(file.size / 1_000_000)} MB; a Mermaid file can be at most 1 MB.`
      );
      return;
    }
    // FileReader, as Open uses: Blob.text() is missing from older engines.
    const reader = new FileReader();
    reader.onload = () => {
      setFileError(null);
      setText(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      setFileError(`“${file.name}” could not be read.`);
    };
    reader.readAsText(file);
  };

  const doImport = () => {
    if (!result?.scene) return;
    uiStateActions.resetUiState();
    load(result.scene, { fitToView: true });
    onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Import Mermaid"
      maxWidth="md"
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!ready}
            onClick={doImport}
            data-testid="mermaid-import-button"
          >
            Import
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Paste a Mermaid flowchart, or open a .mmd or Markdown file. It
          replaces the diagram on the canvas.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              fileInput.current?.click();
            }}
          >
            Open file…
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            data-testid="mermaid-import-file"
            accept=".mmd,.mermaid,.md,.markdown,.txt,text/plain,text/markdown"
            onChange={(e) => {
              openFile(e.target.files?.[0]);
              // So the same file can be opened again after an edit.
              if (fileInput.current) fileInput.current.value = '';
            }}
          />
          {fileError && (
            <Typography variant="body2" color="error">
              {fileError}
            </Typography>
          )}
        </Stack>
        <TextField
          multiline
          minRows={10}
          maxRows={20}
          value={text}
          placeholder={
            'flowchart LR\n  A[Start] --> B{Choice}\n  B -->|Yes| C[Done]'
          }
          inputRef={textArea}
          onChange={(e) => {
            setText(e.target.value);
          }}
          slotProps={{
            htmlInput: {
              'aria-label': 'Mermaid text',
              'data-testid': 'mermaid-import-text',
              spellCheck: false,
              style: { fontFamily: 'monospace', fontSize: 13 }
            }
          }}
        />
        {errors.length > 0 && (
          <Box data-testid="mermaid-import-errors">
            <Alert severity="error" sx={{ py: 0 }}>
              {errors.length === 1
                ? 'This cannot be imported yet:'
                : `This cannot be imported yet (${errors.length} problems):`}
            </Alert>
            <List dense disablePadding>
              {errors.map((issue, i) => {
                return (
                  <ListItemButton
                    key={`${issue.code}-${i}`}
                    onClick={() => {
                      goTo(issue);
                    }}
                    disabled={issue.line === undefined}
                  >
                    <ListItemText
                      primary={formatIssue(issue)}
                      secondary={issue.excerpt ? issue.excerpt : undefined}
                      slotProps={{
                        secondary: { sx: { fontFamily: 'monospace' } }
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}
        {ready && (
          <Typography variant="body2" data-testid="mermaid-import-summary">
            Ready to import: {result!.scene!.objects.length} nodes,{' '}
            {(result!.scene!.views?.[0] as { connectors?: unknown[] })
              .connectors?.length ?? 0}{' '}
            links.
          </Typography>
        )}
        {warnings.length > 0 && errors.length === 0 && (
          <Box data-testid="mermaid-import-warnings">
            <Typography variant="subtitle2">Not carried across</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {warnings.map((w) => {
                return (
                  <Typography component="li" variant="body2" key={w.code}>
                    {formatIssue(w)}
                  </Typography>
                );
              })}
            </Box>
          </Box>
        )}
      </Stack>
    </AppDialog>
  );
};
