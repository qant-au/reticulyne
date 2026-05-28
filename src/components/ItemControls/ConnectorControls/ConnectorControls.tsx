import {
  Connector,
  connectorStyleOptions,
  connectorDirectionOptions,
  connectorGlyphOptions,
  connectorAnimationFlowOptions
} from 'src/types';
import {
  Box,
  Select,
  MenuItem,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Slider
} from '@mui/material';
import { GLYPHS } from 'src/components/SceneLayers/Connectors/glyphs';
import { useConnector } from 'src/hooks/useConnector';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ControlsContainer } from '../components/ControlsContainer';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

// User-facing labels for the connector-direction dropdown (FEA4-02).
// All-caps to match the surrounding form controls and remove the
// "looks like prose" feel of the previous Title Case.
const directionLabels: Record<
  (typeof connectorDirectionOptions)[number],
  string
> = {
  START_TO_END: 'START TO END',
  END_TO_START: 'END TO START',
  BOTH: 'BOTH ENDS',
  NONE: 'NO ARROW'
};

// User-facing labels for the animation-flow dropdown (FEA7-01).
// Forward = travel start→end, reverse = end→start, both = two glyphs
// going opposite ways. When undefined, the renderer derives flow from
// the arrow `direction` for back-compat — surfaced here as a fourth
// "(from direction)" affordance.
const animationFlowLabels: Record<
  (typeof connectorAnimationFlowOptions)[number],
  string
> = {
  forward: 'FORWARD',
  reverse: 'REVERSE',
  both: 'BOTH WAYS'
};

// User-facing labels for the connector-glyph dropdown (FEA5-05).
// Pulled from the GLYPHS registry so the label list stays in lockstep
// with the glyph set without a second maintenance burden. Uppercasing
// happens at the render edge below so any non-UI consumer of GLYPHS
// still sees the canonical Title Case names.
const glyphLabels: Record<(typeof connectorGlyphOptions)[number], string> =
  Object.fromEntries(
    connectorGlyphOptions.map((slug) => {
      return [slug, GLYPHS[slug].label];
    })
  ) as Record<(typeof connectorGlyphOptions)[number], string>;

// Alphabetised slug list for the Arrow Type dropdown. Sorted by the
// uppercased label (the string the user sees) so the rendered order
// matches the visible alphabet. `connectorGlyphOptions` itself stays
// untouched — its order may matter to other call sites (e.g. picker
// thumbnails, default-glyph selection).
const sortedGlyphSlugs = [...connectorGlyphOptions].sort((a, b) => {
  return glyphLabels[a]
    .toUpperCase()
    .localeCompare(glyphLabels[b].toUpperCase());
});

// Width is stored as a number (10 / 20 / 30) so the renderer
// (`(UNPROJECTED_TILE_SIZE / 100) * connector.width`) and the
// persisted schema both stay unchanged. The dropdown maps that
// numeric tier onto the user-facing THIN / MEDIUM / THICK enum.
const widthOptions = [
  { value: 10, label: 'THIN' },
  { value: 20, label: 'MEDIUM' },
  { value: 30, label: 'THICK' }
] as const;

// Inline label that matches the existing <Section title="..."> visual
// language (small uppercase, secondary text colour). Used for each
// half-width dropdown column in the 2×2 grid below.
const inlineSectionLabel = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  pb: 1
} as const;

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
  if (!connector) return null;

  const isArrowDisabled = connector.direction === 'NONE';

  return (
    <ControlsContainer>
      <Section>
        <TextField
          label="Description"
          value={connector.description}
          // Keep the label floated at the top regardless of focus or
          // value. Without this, an empty + unfocused field reads as
          // if "Description" were the typed value rather than the
          // label — users couldn't tell the field was editable.
          // (MUI v9 moved this from the deprecated `InputLabelProps`
          // to `slotProps.inputLabel`.)
          slotProps={{ inputLabel: { shrink: true } }}
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
      <Box
        sx={{
          pt: 3,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={inlineSectionLabel}>
              Width
            </Typography>
            <Select
              fullWidth
              value={connector.width}
              onChange={(e) => {
                updateConnector(connector.id, {
                  width: e.target.value as Connector['width']
                });
              }}
            >
              {widthOptions.map((option) => {
                return (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                );
              })}
            </Select>
          </Box>
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
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
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
              Arrow Type
            </Typography>
            <Select
              fullWidth
              // Direction "NONE" means no arrow heads render, so the
              // glyph choice doesn't matter. Grey the control out
              // rather than silently ignoring the value.
              disabled={isArrowDisabled}
              value={connector.glyph}
              onChange={(e) => {
                updateConnector(connector.id, {
                  glyph: e.target.value as Connector['glyph']
                });
              }}
            >
              {sortedGlyphSlugs.map((slug) => {
                return (
                  <MenuItem key={slug} value={slug}>
                    {glyphLabels[slug].toUpperCase()}
                  </MenuItem>
                );
              })}
            </Select>
          </Box>
        </Box>
      </Box>
      {enableAnimation && (
        <Box
          sx={{
            pt: 2,
            px: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
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
          {/* FEA7-01: rate + flow controls. Disabled (not hidden) when
              Animate is off so they don't shift around as users toggle
              the master switch — clearer affordance that they belong
              to the animation block. */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={inlineSectionLabel}>
                Rate
              </Typography>
              <Slider
                disabled={!connector.animated}
                min={0}
                max={1}
                step={0.05}
                value={connector.animationRate ?? 1}
                valueLabelDisplay="auto"
                onChange={(_, value) => {
                  updateConnector(connector.id, {
                    animationRate: value as number
                  });
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={inlineSectionLabel}>
                Flow
              </Typography>
              <Select
                fullWidth
                disabled={!connector.animated}
                // Surface the fallback (direction-derived) as a
                // distinct value rather than hiding it — embedders
                // and users alike benefit from seeing that "undefined
                // == derive from direction" is the current state.
                value={connector.animationFlow ?? ''}
                displayEmpty
                onChange={(e) => {
                  const next = e.target.value as string;
                  updateConnector(connector.id, {
                    animationFlow:
                      next === ''
                        ? undefined
                        : (next as Connector['animationFlow'])
                  });
                }}
              >
                <MenuItem value="">FROM DIRECTION</MenuItem>
                {connectorAnimationFlowOptions.map((flow) => {
                  return (
                    <MenuItem key={flow} value={flow}>
                      {animationFlowLabels[flow]}
                    </MenuItem>
                  );
                })}
              </Select>
            </Box>
          </Box>
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
