import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useSceneItemsList } from 'src/hooks/sceneLists';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { CoordsUtils } from 'src/utils';
import type { Coords } from 'src/types';

// ROADMAP 2.1: in connector mode, the node under the pointer shows a port
// on each of its four tile edges, so a new user can see where a connector
// will attach, both before starting one and while choosing its end.
//
// Discoverability only. A connector anchor references a node, not an edge
// of it (the schema has no side), so every port leads to the same anchor.
// Snapping to a specific edge would need an anchor-side field; see the
// ROADMAP 2.1 note.
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
  const tile = useUiStateStore((state) => {
    return state.mouse.position.tile;
  });
  const items = useSceneItemsList();

  const hovered = useMemo(() => {
    if (modeType !== 'CONNECTOR') return null;
    return (
      items.find((item) => {
        return CoordsUtils.isEqual(item.tile, tile);
      }) ?? null
    );
  }, [modeType, items, tile]);

  if (!hovered) return null;
  return <Ports tile={hovered.tile} />;
};
