import { useEffect, useRef, useState } from 'react';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { modelFromModelStore, performSave } from 'src/utils';
import { visuallyHidden } from 'src/components/ScreenReaderSupport/ScreenReaderSupport';

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

// How long a tapped tooltip stays open unless the user taps elsewhere.
export const TIP_PIN_MS = 5000;

// `compact` (the title bar on a phone) says the same in fewer words, so the
// status stays on one line: "Unsaved changes" wrapped to two and kept its
// width while the title shrank to a few letters (sweep 2026-09-30, round 3).
export const SaveStatusPill = ({ compact = false }: { compact?: boolean }) => {
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
  // Opened by a hover, or pinned by a tap (its click): MUI's own touch
  // opening waits for a press, and a quick tap ended it first. A pinned tip
  // ignores MUI's closes - on a touch screen the larger tooltip landed
  // under the tapped point, the emulated mouse "left" the pill and closed
  // it before it faded in - and stays until a tap elsewhere or TIP_PIN_MS.
  const [tipHover, setTipHover] = useState(false);
  const [tipPinned, setTipPinned] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tipPinned) return undefined;
    const unpin = () => {
      setTipPinned(false);
      setTipHover(false);
    };
    const timer = setTimeout(unpin, TIP_PIN_MS);
    const onPointerDown = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) unpin();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [tipPinned]);

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
  const shown = compact
    ? ({
        'Unsaved changes': 'Unsaved',
        'Save failed': 'Failed'
      }[label] ?? (label.startsWith('Saved ') ? 'Saved' : label))
    : label;

  // The full wording, when the pill shows less: a tooltip a tap opens (a
  // native title only showed on a mouse hover, so a tap showed nothing),
  // and the text assistive tech reads (it read the short word).
  const more = status.error ?? (shown !== label ? label : null);

  const pill = (
    <Box
      role="status"
      aria-live="polite"
      data-testid="save-status"
      ref={pillRef}
      onClick={
        more
          ? () => {
              if (tipPinned) setTipHover(false);
              setTipPinned(!tipPinned);
            }
          : undefined
      }
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        ml: compact ? 1 : 2,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        pointerEvents: more ? 'auto' : undefined
      }}
    >
      <Typography variant="body2" sx={{ color: tone, fontWeight: 600 }}>
        {shown !== label ? (
          <>
            <span aria-hidden>{shown}</span>
            <Box component="span" sx={visuallyHidden}>
              {label}
            </Box>
          </>
        ) : (
          shown
        )}
      </Typography>
      {status.state === 'error' && (
        <Button
          size="small"
          color="error"
          sx={{ pointerEvents: 'auto', minWidth: 0 }}
          onClick={() => {
            void performSave(onSave, modelFromModelStore(modelActions.get()), {
              getStatus: uiStateActions.getSaveStatus,
              setStatus: uiStateActions.setSaveStatus,
              getSceneContext: () => {
                return uiStateActions.get().sceneContext;
              }
            });
          }}
        >
          Retry
        </Button>
      )}
    </Box>
  );

  if (!more) return pill;
  return (
    <Tooltip
      title={more}
      describeChild
      open={tipPinned || tipHover}
      onOpen={() => {
        setTipHover(true);
      }}
      onClose={() => {
        setTipHover(false);
      }}
      disableInteractive
      placement="top"
    >
      {pill}
    </Tooltip>
  );
};
