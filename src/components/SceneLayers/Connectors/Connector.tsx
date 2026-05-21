import { useMemo } from 'react';
import { useTheme, Box } from '@mui/material';
import { UNPROJECTED_TILE_SIZE } from 'src/config';
import {
  getAnchorTile,
  getColorVariant,
  getConnectorDirectionIcon
} from 'src/utils';
import { Circle } from 'src/components/Circle/Circle';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useConnector } from 'src/hooks/useConnector';
import { useScene } from 'src/hooks/useScene';
import { useColor } from 'src/hooks/useColor';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { GlyphRenderer } from './glyphs';

// FEA5-06: fixed end-to-end animation duration for the looping
// moving glyph. Per-connector tuning (e.g. `speedMs` on the schema)
// can come later; a single global timing keeps Stage 2 minimal.
const ANIMATION_DURATION_SECONDS = 2;

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
  isSelected?: boolean;
}

export const Connector = ({ connector: _connector, isSelected }: Props) => {
  const theme = useTheme();
  const color = useColor(_connector.color);
  const { currentView } = useScene();
  const connector = useConnector(_connector.id);
  const enableAnimation = useUiStateStore((state) => {
    return state.enableAnimation;
  });
  const { css, pxSize } = useIsoProjection({
    ...connector.path.rectangle
  });

  // Stable SVG fragment-id for <animateMotion><mpath href> to point
  // at the polyline below. Encoded so embedders' arbitrary id
  // strings (URIs, slashes, etc.) can't break the selector.
  const pathElementId = useMemo(() => {
    return `connector-path-${encodeURIComponent(connector.id)}`;
  }, [connector.id]);
  const isLooping = enableAnimation && connector.animated;

  const drawOffset = useMemo(() => {
    return {
      x: UNPROJECTED_TILE_SIZE / 2,
      y: UNPROJECTED_TILE_SIZE / 2
    };
  }, []);

  const pathString = useMemo(() => {
    return connector.path.tiles.reduce((acc, tile) => {
      return `${acc} ${tile.x * UNPROJECTED_TILE_SIZE + drawOffset.x},${
        tile.y * UNPROJECTED_TILE_SIZE + drawOffset.y
      }`;
    }, '');
  }, [connector.path.tiles, drawOffset]);

  const anchorPositions = useMemo(() => {
    if (!isSelected) return [];

    return connector.anchors.map((anchor) => {
      const position = getAnchorTile(anchor, currentView);

      // Anchor position in SVG-local coords = world-anchor minus the
      // rectangle's bottom-left corner (the search-area origin). The
      // operand order matches the new low-to-high rectangle
      // convention; see BUG4-01 / normalisePositionFromOrigin.
      return {
        id: anchor.id,
        x:
          (position.x - connector.path.rectangle.from.x) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.x,
        y:
          (position.y - connector.path.rectangle.from.y) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.y
      };
    });
  }, [
    currentView,
    connector.path.rectangle,
    connector.anchors,
    drawOffset,
    isSelected
  ]);

  const directionIcons = useMemo(() => {
    return getConnectorDirectionIcon(connector.path.tiles, connector.direction);
  }, [connector.path.tiles, connector.direction]);

  const connectorWidthPx = useMemo(() => {
    return (UNPROJECTED_TILE_SIZE / 100) * connector.width;
  }, [connector.width]);

  const strokeDashArray = useMemo(() => {
    switch (connector.style) {
      case 'DASHED':
        return `${connectorWidthPx * 2}, ${connectorWidthPx * 2}`;
      case 'DOTTED':
        return `0, ${connectorWidthPx * 1.8}`;
      case 'SOLID':
      default:
        return 'none';
    }
  }, [connector.style, connectorWidthPx]);

  return (
    <Box style={css}>
      <Svg viewboxSize={pxSize}>
        <polyline
          points={pathString}
          stroke={theme.palette.common.white}
          strokeWidth={connectorWidthPx * 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.7}
          strokeDasharray={strokeDashArray}
          fill="none"
        />
        <polyline
          id={pathElementId}
          points={pathString}
          stroke={getColorVariant(color.value, 'dark', { grade: 1 })}
          strokeWidth={connectorWidthPx}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDashArray}
          fill="none"
        />

        {anchorPositions.map((anchor) => {
          return (
            <g key={anchor.id}>
              <Circle
                tile={anchor}
                radius={18}
                fill={theme.palette.common.white}
                fillOpacity={0.7}
              />
              <Circle
                tile={anchor}
                radius={12}
                stroke={theme.palette.common.black}
                fill={theme.palette.common.white}
                strokeWidth={6}
              />
            </g>
          );
        })}

        {directionIcons.map((icon, i) => {
          return (
            <g key={i} transform={`translate(${icon.x}, ${icon.y})`}>
              <GlyphRenderer
                glyph={connector.glyph}
                rotation={icon.rotation}
                fill="black"
                stroke={theme.palette.common.white}
                strokeWidth={4}
              />
            </g>
          );
        })}

        {isLooping && (
          <GlyphRenderer
            glyph={connector.glyph}
            rotation={0}
            fill="black"
            stroke={theme.palette.common.white}
            strokeWidth={4}
            motion={{
              pathHref: `#${pathElementId}`,
              durSeconds: ANIMATION_DURATION_SECONDS,
              reverse: connector.direction === 'END_TO_START'
            }}
          />
        )}
      </Svg>
    </Box>
  );
};
