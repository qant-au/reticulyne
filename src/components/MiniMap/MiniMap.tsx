import { useMemo, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { getTilePosition } from 'src/utils';
import type { Coords } from 'src/types';

// the whole diagram in miniature, bottom-right, with the
// visible area outlined. Click or drag in it to move the view there.
// Everything is in scene coordinates (the projected plane the renderer
// scales and scrolls), so a scene point p is on screen at
// size / 2 + scroll + p * zoom, and centring on p means scroll = -p * zoom.
const W = 200;
const H = 150;
// The width below which the title bar moves up a row (TitleBar.tsx); at
// 720 the map covered that raised title between 720 and 800.
export const MIN_CANVAS_WIDTH = 800;
const PAD = 60;

// Where on the map a pointer is, held to the map: a drag that runs off
// the map keeps the view at the map's edge. Without it, a press on the
// map carried on across the canvas threw the view far past the diagram,
// which then looked blank (sweep 2026-09-30, A14c).
export const pointOnMap = (
  client: Coords,
  box: { left: number; top: number }
): Coords => {
  return {
    x: Math.min(W, Math.max(0, client.x - box.left)),
    y: Math.min(H, Math.max(0, client.y - box.top))
  };
};

export const MiniMap = () => {
  const theme = useTheme();
  const visible = useUiStateStore((state) => {
    return state.showMiniMap ?? state.editorMode === 'EDITABLE';
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
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const { size } = useResizeObserver(rendererEl);
  const { items, rectangles, colors, projection } = useScene();
  const dragging = useRef(false);

  const layout = useMemo(() => {
    const nodes = items.map((i) => {
      return getTilePosition({ tile: i.tile, projection });
    });
    const rects = rectangles.map((r) => {
      const corners = [
        r.from,
        { x: r.to.x, y: r.from.y },
        r.to,
        { x: r.from.x, y: r.to.y }
      ].map((t) => {
        return getTilePosition({ tile: t, projection });
      });
      const colour =
        r.colorValue ??
        colors.find((c) => {
          return c.id === r.color;
        })?.value;
      return { id: r.id, corners, colour };
    });
    const pts = [
      ...nodes,
      ...rects.flatMap((r) => {
        return r.corners;
      })
    ];
    if (pts.length === 0) return null;
    const minX =
      Math.min(
        ...pts.map((p) => {
          return p.x;
        })
      ) - PAD;
    const maxX =
      Math.max(
        ...pts.map((p) => {
          return p.x;
        })
      ) + PAD;
    const minY =
      Math.min(
        ...pts.map((p) => {
          return p.y;
        })
      ) - PAD;
    const maxY =
      Math.max(
        ...pts.map((p) => {
          return p.y;
        })
      ) + PAD;
    const scale = Math.min(W / (maxX - minX), H / (maxY - minY));
    const offset = {
      x: (W - (maxX - minX) * scale) / 2 - minX * scale,
      y: (H - (maxY - minY) * scale) / 2 - minY * scale
    };
    return { nodes, rects, scale, offset };
  }, [items, rectangles, colors, projection]);

  // Too narrow to sit beside the zoom controls and the title bar: on a
  // phone it covered both.
  if (!visible || !layout || size.width < MIN_CANVAS_WIDTH) return null;

  const toMap = (p: Coords) => {
    return {
      x: p.x * layout.scale + layout.offset.x,
      y: p.y * layout.scale + layout.offset.y
    };
  };
  const toScene = (m: Coords) => {
    return {
      x: (m.x - layout.offset.x) / layout.scale,
      y: (m.y - layout.offset.y) / layout.scale
    };
  };

  // The visible area, from the screen corners back to scene coordinates.
  const view = {
    a: toMap({
      x: (-size.width / 2 - scroll.position.x) / zoom,
      y: (-size.height / 2 - scroll.position.y) / zoom
    }),
    b: toMap({
      x: (size.width / 2 - scroll.position.x) / zoom,
      y: (size.height / 2 - scroll.position.y) / zoom
    })
  };

  const moveTo = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const p = toScene(pointOnMap({ x: e.clientX, y: e.clientY }, box));
    uiStateActions.setScroll({
      position: { x: -p.x * zoom, y: -p.y * zoom },
      offset: scroll.offset
    });
  };

  return (
    <Box
      data-testid="mini-map"
      sx={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: W,
        height: H,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: 2,
        opacity: 0.92
      }}
    >
      <svg
        width={W}
        height={H}
        role="img"
        aria-label="Overview map; click to move the view"
        style={{ display: 'block', cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) moveTo(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {layout.rects.map((r) => {
          return (
            <polygon
              key={r.id}
              points={r.corners
                .map((c) => {
                  const m = toMap(c);
                  return `${m.x},${m.y}`;
                })
                .join(' ')}
              fill={r.colour ?? theme.palette.grey[400]}
              fillOpacity={0.5}
            />
          );
        })}
        {layout.nodes.map((n, i) => {
          const m = toMap(n);
          return (
            <rect
              key={i}
              x={m.x - 2}
              y={m.y - 2}
              width={4}
              height={4}
              fill={theme.palette.text.secondary}
            />
          );
        })}
        {(() => {
          // Clamp to the map, so a view bigger than the whole diagram still
          // shows its outline along the map's edges instead of vanishing.
          const x1 = Math.max(1, Math.min(view.a.x, view.b.x));
          const y1 = Math.max(1, Math.min(view.a.y, view.b.y));
          const x2 = Math.min(W - 1, Math.max(view.a.x, view.b.x));
          const y2 = Math.min(H - 1, Math.max(view.a.y, view.b.y));
          return (
            <rect
              data-testid="mini-map-viewport"
              x={x1}
              y={y1}
              width={Math.max(0, x2 - x1)}
              height={Math.max(0, y2 - y1)}
              fill="none"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
            />
          );
        })()}
      </svg>
    </Box>
  );
};
