import { Box, Slider, Typography } from '@mui/material';
import { useRectangle } from 'src/hooks/useRectangle';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useColor } from 'src/hooks/useColor';
import { HexField } from './HexField';
import { ControlsContainer } from '../components/ControlsContainer';
import { Header } from '../components/Header';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';
import { LayerOrderSection } from '../components/LayerOrderSection';

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
  const swatch = useColor(rectangle?.color);
  if (!rectangle) return null;

  return (
    <ControlsContainer header={<Header title="Edit rectangle" />}>
      <Section>
        <ColorSelector
          onChange={(color) => {
            // Picking a swatch drops a hex override, which otherwise kept
            // painting over it while the swatch showed as chosen.
            updateRectangle(rectangle.id, { color, colorValue: undefined });
          }}
          // No swatch shows as chosen while a hex override paints over it.
          activeColor={rectangle.colorValue ? undefined : rectangle.color}
        />
      </Section>
      <Section title="Fill colour">
        <HexField
          label="Fill hex override"
          value={rectangle.colorValue}
          placeholder={swatch.value}
          onChange={(colorValue) => {
            updateRectangle(rectangle.id, { colorValue });
          }}
        />
      </Section>
      <Section title="Border colour">
        <HexField
          label="Border hex override"
          value={rectangle.outlineColor}
          placeholder="#rrggbb"
          onChange={(outlineColor) => {
            updateRectangle(rectangle.id, { outlineColor });
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
              // Keyboard steps accumulate float error (0.4999…).
              transparency: Math.round((value as number) * 100) / 100
            });
          }}
        />
      </Box>
      <LayerOrderSection targets={[{ type: 'RECTANGLE', id }]} />
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
