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
// moving glyph. FEA7-01: per-connector `animationRate` scales this
// inversely (rate 1 = full speed, rate 0.5 = half speed, rate 0
// stops the animation entirely).
const ANIMATION_DURATION_SECONDS = 2;
// Smallest non-zero rate the renderer will accept before treating
// the animation as "stopped". Prevents division by ~0 turning into
// implausibly long durations that browsers may special-case.
const MIN_ANIMATION_RATE = 0.01;

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
  isSelected?: boolean;
}

export const Connector = ({ connector: _connector, isSelected }: Props) => {
  const theme = useTheme();
  const color = useColor(_connector.color);
  const { currentView } = useScene();
  // useConnector may return null during the final render cycle after the
  // connector is deleted but before this component unmounts. All hook
  // calls below use _connector (the always-valid prop) so they are
  // unconditional. The guard before the return keeps deleted connectors
  // out of the DOM without hitting IsoflowErrorBoundary.
  const connector = useConnector(_connector.id);
  const enableAnimation = useUiStateStore((state) => {
    return state.enableAnimation;
  });
  // FEA5-07: runtime pulse overlay. _connector.id used (not connector.id)
  // so this subscription is unconditional when connector is null.
  const pulseOverlay = useSceneStore((state) => {
    return state.connectorOverlays[_connector.id];
  });
  const { css, pxSize, gridSize } = useIsoProjection({
    ..._connector.path.rectangle
  });

  // Stable SVG fragment-id for <animateMotion><mpath href> to point
  // at the polyline below. Encoded so embedders' arbitrary id
  // strings (URIs, slashes, etc.) can't break the selector.
  const pathElementId = useMemo(() => {
    return `connector-path-${encodeURIComponent(_connector.id)}`;
  }, [_connector.id]);
  // FEA7-01: animationRate is opt-in. Undefined preserves the legacy
  // full-speed loop; a defined value scales the animation duration
  // and 0 halts it without removing the connector's `animated` flag.
  const animationRate = _connector.animationRate ?? 1;
  const isLooping =
    enableAnimation && Boolean(_connector.animated) && animationRate > 0;
  const animationDurationSeconds =
    ANIMATION_DURATION_SECONDS / Math.max(animationRate, MIN_ANIMATION_RATE);
  // FEA7-01: explicit flow overrides the direction-derived reverse.
  // The fallback reproduces the pre-FEA7 rule exactly so diagrams
  // without `animationFlow` set render byte-identical.
  const fallbackReverse = _connector.direction === 'END_TO_START';
  const animationFlow =
    _connector.animationFlow ?? (fallbackReverse ? 'reverse' : 'forward');

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
    return _connector.path.tiles.map((tile) => {
      return { x: tile.x, y: flipConnectorTileY(tile.y, gridSize.height) };
    });
  }, [_connector.path.tiles, gridSize.height]);

  const pathString = useMemo(() => {
    return renderTiles.reduce((acc, tile) => {
      return `${acc} ${tile.x * UNPROJECTED_TILE_SIZE + drawOffset.x},${
        tile.y * UNPROJECTED_TILE_SIZE + drawOffset.y
      }`;
    }, '');
  }, [renderTiles, drawOffset]);

  const anchorPositions = useMemo(() => {
    if (!isSelected) return [];

    return _connector.anchors.map((anchor) => {
      const position = getAnchorTile(anchor, currentView);

      // Anchor handle in SVG-local coords. X matches the path
      // normalisation (BUG4-01); Y is flipped through the bounding
      // box (see anchorWorldYToRenderY) so it lands on top of the
      // Y-flipped path tile rather than its world-Y mirror.
      return {
        id: anchor.id,
        x:
          (position.x - _connector.path.rectangle.from.x) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.x,
        y:
          anchorWorldYToRenderY(position.y, _connector.path.rectangle.to.y) *
            UNPROJECTED_TILE_SIZE +
          drawOffset.y
      };
    });
  }, [
    currentView,
    _connector.path.rectangle,
    _connector.anchors,
    drawOffset,
    isSelected
  ]);

  const directionIcons = useMemo(() => {
    // Feed the Y-flipped tiles so the arrow's pixel position AND its
    // rotation (computed in computeArrowFromTwoTiles using the SVG-
    // local-tile convention where +Y = south on screen) both match the
    // rendered polyline.
    return getConnectorDirectionIcon(renderTiles, _connector.direction);
  }, [renderTiles, _connector.direction]);

  const connectorWidthPx = useMemo(() => {
    return (UNPROJECTED_TILE_SIZE / 100) * _connector.width;
  }, [_connector.width]);

  const strokeDashArray = useMemo(() => {
    switch (_connector.style) {
      case 'DASHED':
        return `${connectorWidthPx * 2}, ${connectorWidthPx * 2}`;
      case 'DOTTED':
        return `0, ${connectorWidthPx * 1.8}`;
      case 'SOLID':
      default:
        return 'none';
    }
  }, [_connector.style, connectorWidthPx]);

  if (!connector) return null;

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

        {isLooping && animationFlow !== 'reverse' && (
          <GlyphRenderer
            glyph={connector.glyph}
            rotation={0}
            fill="black"
            stroke={theme.palette.common.white}
            strokeWidth={4}
            motion={{
              pathHref: `#${pathElementId}`,
              durSeconds: animationDurationSeconds,
              reverse: false
            }}
          />
        )}
        {isLooping && animationFlow !== 'forward' && (
          <GlyphRenderer
            // FEA7-01: when flow is 'both', this second glyph travels
            // in the opposite direction so the connector carries two
            // moving glyphs simultaneously. When flow is 'reverse',
            // this is the sole glyph (matches the legacy single-glyph
            // behaviour but explicitly reversed).
            glyph={connector.glyph}
            rotation={0}
            fill="black"
            stroke={theme.palette.common.white}
            strokeWidth={4}
            motion={{
              pathHref: `#${pathElementId}`,
              durSeconds: animationDurationSeconds,
              reverse: true
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
