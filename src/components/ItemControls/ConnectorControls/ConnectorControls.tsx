import {
  Connector,
  connectorStyleOptions,
  connectorDirectionOptions,
  connectorGlyphOptions
} from 'src/types';
import {
  Box,
  Slider,
  Select,
  MenuItem,
  TextField,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';
import { GLYPHS } from 'src/components/SceneLayers/Connectors/glyphs';

// User-facing labels for the connector-direction dropdown (FEA4-02).
const directionLabels: Record<
  (typeof connectorDirectionOptions)[number],
  string
> = {
  START_TO_END: 'Start to end',
  END_TO_START: 'End to start',
  BOTH: 'Both ends',
  NONE: 'No arrow'
};

// User-facing labels for the connector-glyph dropdown (FEA5-05).
// Pulled from the GLYPHS registry so the label list stays in lockstep
// with the glyph set without a second maintenance burden.
const glyphLabels: Record<(typeof connectorGlyphOptions)[number], string> =
  Object.fromEntries(
    connectorGlyphOptions.map((slug) => {
      return [slug, GLYPHS[slug].label];
    })
  ) as Record<(typeof connectorGlyphOptions)[number], string>;

// Inline label that matches the existing <Section title="..."> visual
// language (small uppercase, secondary text colour). Used in the
// half-width STYLE + ARROW row below.
const inlineSectionLabel = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  pb: 1
} as const;
import { useConnector } from 'src/hooks/useConnector';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ControlsContainer } from '../components/ControlsContainer';
import { Header } from '../components/Header';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

interface Props {
  id: string;
}

export const ConnectorControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const enableAnimation = useUiStateStore((state) => {
    return state.enableAnimation;
  });
  const connector = useConnector(id);
  const { updateConnector, deleteConnector } = useScene();

  return (
    <ControlsContainer header={<Header title="Edit line" />}>
      <Section>
        <TextField
          label="Description"
          value={connector.description}
          onChange={(e) => {
            updateConnector(connector.id, {
              description: e.target.value as string
            });
          }}
        />
      </Section>
      <Section>
        <ColorSelector
          onChange={(color) => {
            return updateConnector(connector.id, { color });
          }}
          activeColor={connector.color}
        />
      </Section>
      <Section title="Width">
        <Slider
          marks
          step={10}
          min={10}
          max={30}
          value={connector.width}
          onChange={(_e, newWidth) => {
            updateConnector(connector.id, { width: newWidth as number });
          }}
        />
      </Section>
      <Box sx={{ pt: 3, px: 3, display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={inlineSectionLabel}>
            Style
          </Typography>
          <Select
            fullWidth
            value={connector.style}
            onChange={(e) => {
              updateConnector(connector.id, {
                style: e.target.value as Connector['style']
              });
            }}
          >
            {Object.values(connectorStyleOptions).map((style) => {
              return (
                <MenuItem key={style} value={style}>
                  {style}
                </MenuItem>
              );
            })}
          </Select>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={inlineSectionLabel}>
            Arrow
          </Typography>
          <Select
            fullWidth
            value={connector.direction}
            onChange={(e) => {
              updateConnector(connector.id, {
                direction: e.target.value as Connector['direction']
              });
            }}
          >
            {Object.values(connectorDirectionOptions).map((direction) => {
              return (
                <MenuItem key={direction} value={direction}>
                  {directionLabels[direction]}
                </MenuItem>
              );
            })}
          </Select>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={inlineSectionLabel}>
            Type
          </Typography>
          <Select
            fullWidth
            value={connector.glyph}
            onChange={(e) => {
              updateConnector(connector.id, {
                glyph: e.target.value as Connector['glyph']
              });
            }}
          >
            {connectorGlyphOptions.map((slug) => {
              return (
                <MenuItem key={slug} value={slug}>
                  {glyphLabels[slug]}
                </MenuItem>
              );
            })}
          </Select>
        </Box>
      </Box>
      {enableAnimation && (
        <Box sx={{ pt: 2, px: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(connector.animated)}
                onChange={(e) => {
                  updateConnector(connector.id, {
                    animated: e.target.checked
                  });
                }}
              />
            }
            label="Animate"
          />
        </Box>
      )}
      <Section>
        <Box>
          <DeleteButton
            onClick={() => {
              uiStateActions.setItemControls(null);
              deleteConnector(connector.id);
            }}
          />
        </Box>
      </Section>
    </ControlsContainer>
  );
};
