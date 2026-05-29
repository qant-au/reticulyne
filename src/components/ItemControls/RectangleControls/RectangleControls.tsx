import { Box, TextField, Slider, Typography } from '@mui/material';
import { useRectangle } from 'src/hooks/useRectangle';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ControlsContainer } from '../components/ControlsContainer';
import { Header } from '../components/Header';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const inlineSectionLabel = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  pb: 1
} as const;

interface Props {
  id: string;
}

export const RectangleControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const rectangle = useRectangle(id);
  const { updateRectangle, deleteRectangle } = useScene();
  if (!rectangle) return null;

  return (
    <ControlsContainer header={<Header title="Edit rectangle" />}>
      <Section>
        <ColorSelector
          onChange={(color) => {
            updateRectangle(rectangle.id, { color });
          }}
          activeColor={rectangle.color}
        />
      </Section>
      <Section title="Fill colour">
        <TextField
          fullWidth
          label="Hex override"
          placeholder="#rrggbb"
          value={rectangle.colorValue ?? ''}
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === '') {
              updateRectangle(rectangle.id, { colorValue: undefined });
            } else if (HEX_RE.test(v)) {
              updateRectangle(rectangle.id, { colorValue: v });
            }
          }}
        />
      </Section>
      <Section title="Border colour">
        <TextField
          fullWidth
          label="Hex override"
          placeholder="#rrggbb"
          value={rectangle.outlineColor ?? ''}
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === '') {
              updateRectangle(rectangle.id, { outlineColor: undefined });
            } else if (HEX_RE.test(v)) {
              updateRectangle(rectangle.id, { outlineColor: v });
            }
          }}
        />
      </Section>
      <Box sx={{ pt: 3, px: 3 }}>
        <Typography variant="body2" sx={inlineSectionLabel}>
          Transparency
        </Typography>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={rectangle.transparency ?? 0}
          valueLabelDisplay="auto"
          onChange={(_, value) => {
            updateRectangle(rectangle.id, {
              transparency: value as number
            });
          }}
        />
      </Box>
      <Section>
        <Box>
          <DeleteButton
            onClick={() => {
              uiStateActions.setItemControls(null);
              deleteRectangle(rectangle.id);
            }}
          />
        </Box>
      </Section>
    </ControlsContainer>
  );
};
