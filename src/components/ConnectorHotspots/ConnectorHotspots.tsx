import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useSceneItemsList } from 'src/hooks/sceneLists';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { CoordsUtils, getNodeAtPort, nodesNearTile } from 'src/utils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { usePointerOverCanvas } from 'src/hooks/usePointerOverCanvas';
import type { Coords } from 'src/types';

// the node under the pointer shows a port on each of
// its four tile edges: in connector mode, and in the plain cursor mode of
// an editable diagram, where pressing a port starts a connector (2.5).
//
// Discoverability only. A connector anchor references a node, not an edge
// of it (the schema has no side), so every port leads to the same anchor.
// Snapping to a specific edge would need an anchor-side field in the schema.
const Ports = ({ tile }: { tile: Coords }) => {
  const theme = useTheme();
  const { css, pxSize } = useIsoProjection({ from: tile, to: tile });
  const { width: w, height: h } = pxSize;
  const points = [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 }
  ];

  return (
    <Svg
      viewboxSize={pxSize}
      style={{ ...css, overflow: 'visible', pointerEvents: 'none' }}
      data-testid="connector-hotspots"
    >
      {points.map((p) => {
        return (
          <circle
            key={`${p.x}-${p.y}`}
            cx={p.x}
            cy={p.y}
            r={10}
            fill={theme.palette.primary.main}
            fillOpacity={0.45}
            stroke={theme.palette.primary.main}
            strokeWidth={3}
          />
        );
      })}
    </Svg>
  );
};

export const ConnectorHotspots = () => {
  const modeType = useUiStateStore((state) => {
    return state.mode.type;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const mouse = useUiStateStore((state) => {
    return state.mouse;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const scroll = useUiStateStore((state) => {
    return state.scroll;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const { size: rendererSize } = useResizeObserver(rendererEl);
  const items = useSceneItemsList();
  const overCanvas = usePointerOverCanvas();

  const active =
    overCanvas &&
    (modeType === 'CONNECTOR' ||
      (modeType === 'CURSOR' && editorMode === 'EDITABLE' && !mouse.mousedown));

  const hovered = useMemo(() => {
    if (!active) return null;
    const { tile, screen } = mouse.position;
    return (
      items.find((item) => {
        return CoordsUtils.isEqual(item.tile, tile);
      }) ??
      // On a port the pointer can be over the neighbouring tile; keep
      // the ports lit there, or they would vanish as you reach them.
      getNodeAtPort(screen, nodesNearTile(tile, items), {
        zoom,
        scroll,
        rendererSize
      })
    );
  }, [active, items, mouse.position, zoom, scroll, rendererSize]);

  if (!hovered) return null;
  return <Ports tile={hovered.tile} />;
};
