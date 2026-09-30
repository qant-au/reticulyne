import { useEffect, useRef, type FocusEvent } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useTour } from 'src/hooks/useTour';
import { MarkdownEditor } from 'src/components/MarkdownEditor/MarkdownEditorLazy';
import { Surface } from 'src/vendor/accurona-ui';

// lw-064: the tour's narration panel, bottom centre above the title strip.
// While a tour runs it shows the step count, the node's name (or the step's
// title) and the narration (or the node's description), with Previous,
// Next and End. With no tour running and steps offered through the `tour`
// prop, it is a Start tour button instead. NON_INTERACTIVE shows the
// narration only: there, the host steps the tour.
export const TourPanel = () => {
  const tourState = useUiStateStore((state) => {
    return state.tour;
  });
  const tourSteps = useUiStateStore((state) => {
    return state.tourSteps;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const loadGeneration = useUiStateStore((state) => {
    return state.loadGeneration;
  });
  const items = useModelStore((state) => {
    return state.items;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const tour = useTour();
  const titleBarRaised = useUiStateStore((state) => {
    return state.titleBarRaised;
  });

  // Starting, stepping or ending the tour from its own buttons removes (or
  // disables) the button that had focus, which dropped focus to the page.
  // It goes to the obvious next control instead: Next while the tour runs,
  // then the Start tour button, or the canvas when there is none. Only when
  // focus was in here and has been lost, so a tour the host drives never
  // takes focus.
  const hadFocus = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const running = tourState !== null;
  const stepIndex = tourState?.index;
  // Escape ends the tour from wherever focus is (the canvas, the page),
  // and focus returns to Start tour, as it does from End tour. Noted in the
  // capture phase, before the shortcut handler ends the tour.
  const endedByEscape = useRef(false);
  useEffect(() => {
    if (!running) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endedByEscape.current = true;
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [running]);
  useEffect(() => {
    const byEscape = endedByEscape.current && !running;
    endedByEscape.current = false;
    if (byEscape && startRef.current) {
      startRef.current.focus();
      return;
    }
    if (!hadFocus.current) return;
    // A button that has just disabled itself (Previous at step 1) still
    // holds focus here; the browser drops it to the page a moment later.
    const active = document.activeElement as HTMLButtonElement | null;
    if (active && active !== document.body && !active.disabled) return;
    const target = running
      ? nextRef.current
      : (startRef.current ?? uiStateActions.get().rendererEl);
    target?.focus();
  }, [running, stepIndex, uiStateActions]);
  const focusWatch = {
    onFocus: () => {
      hadFocus.current = true;
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      // Previous disabling itself at step 1 blurs it to nothing: focus was
      // lost, not moved away, so it still goes on to Next.
      const lost = e.target as HTMLButtonElement;
      if (e.relatedTarget === null && (lost.disabled || !lost.isConnected)) {
        return;
      }
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        hadFocus.current = false;
      }
    }
  };

  // Another diagram replaced this one: the tour was about the old one.
  const seenGeneration = useRef(loadGeneration);
  useEffect(() => {
    if (seenGeneration.current === loadGeneration) return;
    seenGeneration.current = loadGeneration;
    tour.end();
  }, [loadGeneration, tour]);

  const interactive = editorMode !== 'NON_INTERACTIVE';

  // Above the title strip: on a phone that sits a row up, over the zoom
  // row, and the Start tour button landed on its text (sweep 2026-09-30).
  const placement = {
    position: 'absolute',
    left: '50%',
    bottom: titleBarRaised ? 136 : 88,
    transform: 'translateX(-50%)',
    zIndex: 5
  } as const;

  if (!tourState) {
    if (!interactive || !tourSteps || tourSteps.length === 0) return null;
    return (
      <Surface sx={placement}>
        <Button
          ref={startRef}
          {...focusWatch}
          size="small"
          startIcon={<PlayArrowIcon />}
          onClick={() => {
            tour.start();
          }}
          sx={{ px: 1.5, py: 0.75 }}
        >
          Start tour
        </Button>
      </Surface>
    );
  }

  const { steps, index } = tourState;
  const step = steps[index];
  const node = items.find((item) => {
    return item.id === step.nodeId;
  });
  const title = step.title ?? node?.name ?? '';
  const narration = step.narration ?? node?.description;
  const last = index === steps.length - 1;

  return (
    <Surface
      sx={{
        ...placement,
        width: 'min(480px, calc(100% - 32px))',
        // A narrow host left it about 120px wide, the narration clipped and
        // Previous cut off.
        minWidth: 'min(280px, calc(100vw - 32px))'
      }}
    >
      <Box
        role="region"
        aria-label="Tour"
        data-testid="tour-panel"
        {...focusWatch}
        sx={{ px: 2, pt: 1.25, pb: interactive ? 1 : 1.5 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', flexGrow: 1 }}
          >
            Step {index + 1} of {steps.length}
          </Typography>
          {interactive && (
            <IconButton
              size="small"
              aria-label="End tour"
              onClick={tour.end}
              sx={{ mr: -1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        <Box aria-live="polite">
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          {narration && (
            <Box sx={{ mt: 0.5, maxHeight: 180, overflowY: 'auto' }}>
              <MarkdownEditor value={narration} readOnly />
            </Box>
          )}
        </Box>
        {interactive && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, justifyContent: 'flex-end' }}
          >
            <Button size="small" disabled={index === 0} onClick={tour.previous}>
              Previous
            </Button>
            <Button
              ref={nextRef}
              size="small"
              variant="contained"
              disableElevation
              onClick={last ? tour.end : tour.next}
            >
              {last ? 'Finish' : 'Next'}
            </Button>
          </Stack>
        )}
      </Box>
    </Surface>
  );
};
