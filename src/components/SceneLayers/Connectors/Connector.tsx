import { useMemo } from 'react';
import { useTheme, Box } from '@mui/material';
import { UNPROJECTED_TILE_SIZE } from 'src/config';
import {
  getAnchorTile,
  getColorVariant,
  getConnectorDirectionIcon,
  flipConnectorTileY,
  anchorWorldYToRenderY
} from 'src/utils';
import { Circle } from 'src/components/Circle/Circle';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useConnector } from 'src/hooks/useConnector';
import { useScene } from 'src/hooks/useScene';
import { useColor } from 'src/hooks/useColor';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { GlyphRenderer } from './glyphs';
import type { ConnectorGlyph } from 'src/types';

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
  // FEA5-07: runtime pulse overlay. Driven by useIsoflow().Connector
  // .pulse from outside the component tree; this store subscription
  // re-renders when a pulse starts or expires.
  const pulseOverlay = useSceneStore((state) => {
    return state.connectorOverlays[connector.id];
  });
  const { css, pxSize, gridSize } = useIsoProjection({
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

  // Translate path tiles from the logical "world delta from
  // rectangle.from" coordinate space into the renderer's SVG-local
  // space. See flipConnectorTileY for the why — BUG4-01 fixed the
  // X mirror; this is the Y companion.
  const renderTiles = useMemo(() => {
    return connector.path.tiles.map((tile) => {
      return { x: tile.x, y: flipConnectorTileY(tile.y, gridSize.height) };
    });
  }, [connector.path.tiles, gridSize.height]);

  const pathString = useMemo(() => {
    return renderTiles.reduce((acc, tile) => {
      return `${acc} ${tile.x * UNPROJECTED_TILE_SIZE + drawOffset.x},${
        tile.y * UNPROJECTED_TILE_SIZE + drawOffset.y
      }`;
    }, '');
  }, [renderTiles, drawOffset]);

  const anchorPositions = useMemo(() => {
    if (!isSelected) return [];

    return connector.anchors.map((anchor) => {
      const position = getAnchorTile(anchor, currentView);

      // Anchor handle in SVG-local coords. X matches the path
      // normalisation (BUG4-01); Y is flipped through the bounding
      // box (see anchorWorldYToRenderY) so it lands on top of the
      // Y-flipped path tile rather than its world-Y mirror.
      return {
        id: anchor.id,
        x:
          (position.x - connector.path.rectangle.from.x) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.x,
        y:
          anchorWorldYToRenderY(position.y, connector.path.rectangle.to.y) *
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
    // Feed the Y-flipped tiles so the arrow's pixel position AND its
    // rotation (computed in computeArrowFromTwoTiles using the SVG-
    // local-tile convention where +Y = south on screen) both match the
    // rendered polyline.
    return getConnectorDirectionIcon(renderTiles, connector.direction);
  }, [renderTiles, connector.direction]);

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

        {pulseOverlay?.pulseExpiresAt !== undefined && (
          <GlyphRenderer
            // Re-key on pulseExpiresAt so a fresh pulse triggered
            // mid-flight cleanly restarts the animation rather than
            // letting the in-flight <animateMotion> linger and the
            // glyph teleport.
            key={pulseOverlay.pulseExpiresAt}
            glyph={
              (pulseOverlay.pulseGlyph as ConnectorGlyph) ?? connector.glyph
            }
            rotation={0}
            fill="black"
            stroke={theme.palette.common.white}
            strokeWidth={4}
            motion={{
              pathHref: `#${pathElementId}`,
              durSeconds: (pulseOverlay.pulseDurationMs ?? 1500) / 1000,
              reverse: connector.direction === 'END_TO_START',
              repeatCount: 1
            }}
          />
        )}
      </Svg>
    </Box>
  );
};
