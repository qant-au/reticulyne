import { useState } from 'react';
import {
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography
} from '@mui/material';
import { AppDialog } from 'src/vendor/accurona-ui';
import { useDownloadJson } from 'src/components/MainMenu/useExportJson';
import { useDownloadPdf } from 'src/components/MainMenu/useExportPdf';

// The opt-in for exports that have no options dialog of their own
// (JSON and PDF). Opened only when something is on the Redacted layer.
export const RedactedExportDialog = ({
  format,
  onClose
}: {
  format: 'JSON' | 'PDF';
  onClose: () => void;
}) => {
  const [includeRedacted, setIncludeRedacted] = useState(false);
  const downloadJson = useDownloadJson();
  const downloadPdf = useDownloadPdf();

  return (
    <AppDialog open onClose={onClose} title={`Export as ${format}`}>
      <Stack spacing={2}>
        <Typography variant="body2">
          This diagram has content on the Redacted layer. It is left out of the
          export unless you include it.
        </Typography>
        <FormControlLabel
          label="Include redacted content"
          control={
            <Checkbox
              size="small"
              checked={includeRedacted}
              onChange={(e) => {
                setIncludeRedacted(e.target.checked);
              }}
            />
          }
        />
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // The PDF captures the canvas, so the dialog closes first.
              onClose();
              if (format === 'JSON') downloadJson(includeRedacted);
              else
                downloadPdf(includeRedacted).catch((err: unknown) => {
                  console.error('[reticulyne] PDF export failed:', err);
                });
            }}
          >
            Download {format}
          </Button>
        </Stack>
      </Stack>
    </AppDialog>
  );
};
