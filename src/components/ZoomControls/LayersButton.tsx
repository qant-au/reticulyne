import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  Paper,
  Popper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useScene } from 'src/hooks/useScene';
import { useModelStore } from 'src/stores/modelStore';
import { NAME_MAX } from 'src/schemas/common';
import { LAYERS_MAX } from 'src/schemas/layer';
import { hasRedactedContent } from 'src/utils';
import { Surface, ToolButton } from 'src/vendor/accurona-ui';

// Keyed on the layer and its saved name, so it starts over when either
// changes rather than syncing state in an effect.
const NameField = ({
  initial,
  onCommit
}: {
  initial: string;
  onCommit: (value: string) => void;
}) => {
  const [name, setName] = useState(initial);
  const commit = () => {
    const value = name.trim();
    if (value && value !== initial) onCommit(value);
    else setName(initial);
  };
  return (
    <TextField
      size="small"
      variant="standard"
      value={name}
      slotProps={{
        htmlInput: { maxLength: NAME_MAX, 'aria-label': 'Layer name' }
      }}
      onChange={(e) => {
        setName(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      sx={{ flex: 1 }}
    />
  );
};

// lw-052: the diagram's layers, each with a visibility toggle. The base
// layer (items with no layer) is always shown; the reserved Redacted layer
// is always shown here and left out of every export unless it opts in.
export const LayersButton = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { layers, addLayer, updateLayer, deleteLayer } = useScene();
  const views = useModelStore((state) => {
    return state.views;
  });
  const redactedInUse = useMemo(() => {
    return hasRedactedContent({ views });
  }, [views]);

  const buttonBox = useRef<HTMLDivElement | null>(null);
  const close = () => {
    setAnchor(null);
  };

  return (
    <Surface>
      <Box data-testid="layers-button" ref={buttonBox}>
        <ToolButton
          name="Layers"
          icon={<LayersOutlinedIcon />}
          hasPopup
          expanded={!!anchor}
          isActive={!!anchor}
          onClick={(e) => {
            setAnchor(anchor ? null : e.currentTarget);
          }}
        />
      </Box>
      {/* A non-modal popover (sweep 2026-09-30): the MUI Popover is a modal
          and set aria-hidden on the rest of the page while open. Kept in
          the DOM beside its button, so Tab reaches it next, and fixed so
          the card it sits in does not clip it. */}
      <Popper
        open={!!anchor}
        anchorEl={anchor}
        placement="top-start"
        // Popper calls itself a tooltip; the dialog is the Paper inside.
        role="presentation"
        disablePortal
        popperOptions={{ strategy: 'fixed' }}
        sx={{
          zIndex: (theme) => {
            return theme.zIndex.modal;
          }
        }}
      >
        <ClickAwayListener
          onClickAway={(e) => {
            // The button toggles it itself.
            if (buttonBox.current?.contains(e.target as Node)) return;
            close();
          }}
        >
          <Paper
            role="dialog"
            aria-label="Layers"
            aria-modal="false"
            elevation={8}
            sx={{ width: 300, p: 1.5, mb: 1 }}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              e.stopPropagation();
              close();
              anchor?.focus();
            }}
          >
            <Stack spacing={1} data-testid="layers-panel">
              <Typography variant="subtitle2">Layers</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 34 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Base
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  always shown
                </Typography>
              </Stack>
              {layers.map((layer) => {
                const visible = layer.visible !== false;
                return (
                  <Stack
                    key={layer.id}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                    data-testid={`layer-row-${layer.id}`}
                  >
                    {/* To the side, not below: below it covered the next row's name
                    field (sweep 2026-09-30). */}
                    <Tooltip
                      title={visible ? 'Hide layer' : 'Show layer'}
                      placement="left"
                    >
                      <IconButton
                        size="small"
                        aria-label={`${visible ? 'Hide' : 'Show'} ${layer.name}`}
                        aria-pressed={visible}
                        onClick={() => {
                          updateLayer(layer.id, { visible: !visible });
                        }}
                      >
                        {visible ? (
                          <VisibilityOutlinedIcon fontSize="small" />
                        ) : (
                          <VisibilityOffOutlinedIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <NameField
                      key={`${layer.id}:${layer.name}`}
                      initial={layer.name}
                      onCommit={(name) => {
                        updateLayer(layer.id, { name });
                      }}
                    />
                    <Tooltip
                      title="Delete layer (its items move to Base)"
                      placement="right"
                    >
                      <IconButton
                        size="small"
                        aria-label={`Delete ${layer.name}`}
                        onClick={() => {
                          deleteLayer(layer.id);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                );
              })}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{ width: 34, display: 'flex', justifyContent: 'center' }}
                >
                  <LockOutlinedIcon fontSize="small" color="action" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">Redacted</Typography>
                  <Typography
                    variant="caption"
                    component="p"
                    sx={{ color: 'text.secondary' }}
                  >
                    Shown here, left out of exports unless you include it.
                    {redactedInUse ? '' : ' Nothing is on it yet.'}
                  </Typography>
                </Box>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                disabled={layers.length >= LAYERS_MAX}
                onClick={() => {
                  addLayer(`Layer ${layers.length + 1}`);
                }}
              >
                Add layer
              </Button>
            </Stack>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Surface>
  );
};
