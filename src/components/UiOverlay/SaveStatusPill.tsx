import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { modelFromModelStore, performSave } from 'src/utils';

// where saving stands, in the title bar. Renders nothing
// unless the host passed `onSave`, and nothing for a clean diagram that
// has not been saved in this session.
const ago = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
};

export const SaveStatusPill = () => {
  const onSave = useUiStateStore((state) => {
    return state.onSave;
  });
  const status = useUiStateStore((state) => {
    return state.saveStatus;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const [now, setNow] = useState(() => {
    return Date.now();
  });

  // Keep "Saved N s ago" honest without re-rendering on every frame.
  useEffect(() => {
    if (status.state !== 'saved') return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10_000);
    return () => {
      clearInterval(timer);
    };
  }, [status.state]);

  if (!onSave) return null;

  let label: string | null = null;
  let tone: 'text.secondary' | 'warning.main' | 'error.main' = 'text.secondary';
  if (status.state === 'error') {
    label = 'Save failed';
    tone = 'error.main';
  } else if (status.state === 'saving') {
    label = 'Saving…';
  } else if (status.isDirty) {
    label = 'Unsaved changes';
    tone = 'warning.main';
  } else if (status.state === 'saved' && status.lastSavedAt !== null) {
    label = `Saved ${ago(Math.max(0, now - status.lastSavedAt))}`;
  }
  if (!label) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="save-status"
      title={status.error ?? undefined}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, ml: 2 }}
    >
      <Typography variant="body2" sx={{ color: tone, fontWeight: 600 }}>
        {label}
      </Typography>
      {status.state === 'error' && (
        <Button
          size="small"
          color="error"
          sx={{ pointerEvents: 'auto', minWidth: 0 }}
          onClick={() => {
            void performSave(onSave, modelFromModelStore(modelActions.get()), {
              getStatus: uiStateActions.getSaveStatus,
              setStatus: uiStateActions.setSaveStatus
            });
          }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
};
