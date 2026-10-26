import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import { useShallow } from 'zustand/shallow';
import { AppDialog } from 'src/kit';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  downloadFile,
  filenameForTitle,
  hasRedactedContent,
  modelFromModelStore
} from 'src/utils';
import { sceneFromModel } from 'src/scene/convert';
import { redactScene } from 'src/core';
import { sceneToMermaid, type FlowDirection } from 'src/mermaid';
import { formatIssue } from 'src/mermaid/issues';

// Export as Mermaid: the current view as flowchart text, previewed, with
// what did not carry across listed, to copy or download (.mmd, or .md with
// a ```mermaid fence). What is on the Redacted layer stays out unless
// included, as in every export.
export const ExportMermaidDialog = ({ onClose }: { onClose: () => void }) => {
  const model = useModelStore(
    useShallow((state) => {
      return modelFromModelStore(state);
    })
  );
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const view = useUiStateStore((state) => {
    return state.view;
  });
  const [includeRedacted, setIncludeRedacted] = useState(false);
  const [direction, setDirection] = useState<FlowDirection>('LR');
  const [extended, setExtended] = useState(false);
  const [copied, setCopied] = useState(false);
  const redacted = hasRedactedContent(model);

  const result = useMemo(() => {
    const scene = sceneFromModel(model, uiStateActions.get().sceneContext);
    return sceneToMermaid(includeRedacted ? scene : redactScene(scene), {
      view,
      direction,
      syntax: extended ? 'extended' : 'classic'
    });
  }, [model, uiStateActions, view, includeRedacted, direction, extended]);

  const download = (markdown: boolean) => {
    const text = markdown
      ? `\`\`\`mermaid\n${result.text}\`\`\`\n`
      : result.text;
    downloadFile(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      filenameForTitle(model.title ?? 'Untitled', markdown ? 'md' : 'mmd')
    );
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Export as Mermaid"
      maxWidth="md"
      actions={
        <>
          <Button
            variant="text"
            onClick={() => {
              navigator.clipboard
                ?.writeText(result.text)
                .then(() => {
                  setCopied(true);
                })
                .catch((err: unknown) => {
                  console.error('[reticulyne] copy failed:', err);
                });
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="text"
            onClick={() => {
              download(true);
            }}
          >
            Download .md
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              download(false);
            }}
          >
            Download .mmd
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="mermaid-direction-label">Direction</InputLabel>
            <Select
              labelId="mermaid-direction-label"
              label="Direction"
              value={direction}
              onChange={(e) => {
                setCopied(false);
                setDirection(e.target.value as FlowDirection);
              }}
            >
              <MenuItem value="LR">Left to right</MenuItem>
              <MenuItem value="TB">Top to bottom</MenuItem>
              <MenuItem value="RL">Right to left</MenuItem>
              <MenuItem value="BT">Bottom to top</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            label="Mermaid 11 shapes"
            control={
              <Checkbox
                size="small"
                checked={extended}
                onChange={(e) => {
                  setCopied(false);
                  setExtended(e.target.checked);
                }}
              />
            }
          />
          {redacted && (
            <FormControlLabel
              label="Include redacted content"
              control={
                <Checkbox
                  size="small"
                  checked={includeRedacted}
                  onChange={(e) => {
                    setCopied(false);
                    setIncludeRedacted(e.target.checked);
                  }}
                />
              }
            />
          )}
        </Stack>
        <Box
          component="pre"
          data-testid="mermaid-export-text"
          tabIndex={0}
          aria-label="Mermaid text"
          sx={{
            m: 0,
            p: 1.5,
            maxHeight: 360,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: 13,
            bgcolor: 'action.hover',
            borderRadius: 1
          }}
        >
          {result.text}
        </Box>
        <Typography variant="body2" data-testid="mermaid-export-summary">
          {result.stats.nodes} nodes, {result.stats.links} links
          {result.stats.subgraphs
            ? `, ${result.stats.subgraphs} subgraphs`
            : ''}
          .
          {extended
            ? ' Shapes without brackets need Mermaid 11 or later.'
            : ' Classic shapes only, so any Mermaid renderer reads it.'}
        </Typography>
        {result.warnings.length > 0 && (
          <Box data-testid="mermaid-export-warnings">
            <Typography variant="subtitle2">Not carried across</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {result.warnings.map((w) => {
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
