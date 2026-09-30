import { MenuItem, TextField, Typography } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { REDACTED_LAYER_ID } from 'src/utils';
import type { ItemReference } from 'src/types';
import { PanelSection } from 'src/vendor/accurona-ui';

const BASE = '__base__';
const MIXED = '__mixed__';

// lw-052: which diagram layer one item, or a whole selection, is on.
// Distinct from the layer ORDER section, which stacks items within a kind.
export const LayerSection = ({ targets }: { targets: ItemReference[] }) => {
  const { currentView, layers, setItemsLayer } = useScene();
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  if (editorMode !== 'EDITABLE' || targets.length === 0) return null;

  const lists = {
    ITEM: currentView.items,
    CONNECTOR: currentView.connectors ?? [],
    RECTANGLE: currentView.rectangles ?? [],
    TEXTBOX: currentView.textBoxes ?? []
  };
  const current = new Set(
    targets.map((ref) => {
      if (ref.type === 'CONNECTOR_ANCHOR') return BASE;
      const entry = (
        lists[ref.type] as { id: string; layerId?: string }[]
      ).find((e) => {
        return e.id === ref.id;
      });
      return entry?.layerId ?? BASE;
    })
  );
  const value = current.size === 1 ? [...current][0] : MIXED;

  return (
    <PanelSection title="Layer">
      <TextField
        select
        size="small"
        fullWidth
        value={value}
        slotProps={{ htmlInput: { 'aria-label': 'Layer' } }}
        onChange={(e) => {
          const next = e.target.value;
          if (next === MIXED) return;
          setItemsLayer(targets, next === BASE ? undefined : next);
        }}
      >
        {value === MIXED && (
          <MenuItem value={MIXED} disabled>
            Mixed
          </MenuItem>
        )}
        <MenuItem value={BASE}>Base</MenuItem>
        {layers.map((layer) => {
          return (
            <MenuItem key={layer.id} value={layer.id}>
              {layer.name}
              {layer.visible === false ? ' (hidden)' : ''}
            </MenuItem>
          );
        })}
        <MenuItem value={REDACTED_LAYER_ID}>Redacted</MenuItem>
      </TextField>
      {value === REDACTED_LAYER_ID && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', pt: 1 }}
        >
          Shown here, left out of exports unless the export includes redacted
          content.
        </Typography>
      )}
    </PanelSection>
  );
};
