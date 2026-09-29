import { useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { getTilePosition } from 'src/utils';
import type { Coords } from 'src/types';

// Snapping is inherent: items live on whole tiles and a drag
// moves tile by tile, so there is no free position to snap from. What was
// missing is the guide: while dragging, a line joins each dragged node or
// text box to the nearest other item sharing its tile X or Y, so lining
// things up is visible as it happens. Drawn in scene coordinates inside a
// SceneLayer, so it pans and zooms with the diagram.
const GUIDE = '#d81b9b';

type Point = { key: string; tile: Coords };

const nearestOnLine = (
  from: Coords,
  others: Point[],
  axis: 'x' | 'y'
): Point | null => {
  const other = axis === 'x' ? 'y' : 'x';
  let best: Point | null = null;
  for (const p of others) {
    if (p.tile[axis] !== from[axis]) continue;
    if (
      !best ||
      Math.abs(p.tile[other] - from[other]) <
        Math.abs(best.tile[other] - from[other])
    ) {
      best = p;
    }
  }
  return best;
};

export const SmartGuides = () => {
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const enabled = useUiStateStore((state) => {
    return state.showAlignmentGuides;
  });
  const { items, textBoxes } = useScene();

  const lines = useMemo(() => {
    if (!enabled || mode.type !== 'DRAG_ITEMS') return [];
    const dragged = new Set(
      mode.items.map((i) => {
        return `${i.type}:${i.id}`;
      })
    );
    const all: Point[] = [
      ...items.map((i) => {
        return { key: `ITEM:${i.id}`, tile: i.tile };
      }),
      ...textBoxes.map((t) => {
        return { key: `TEXTBOX:${t.id}`, tile: t.tile };
      })
    ];
    const moving = all.filter((p) => {
      return dragged.has(p.key);
    });
    const still = all.filter((p) => {
      return !dragged.has(p.key);
    });
    const out: { key: string; a: Coords; b: Coords }[] = [];
    for (const m of moving) {
      for (const axis of ['x', 'y'] as const) {
        const hit = nearestOnLine(m.tile, still, axis);
        if (hit) {
          out.push({
            key: `${m.key}-${axis}`,
            a: getTilePosition({ tile: m.tile }),
            b: getTilePosition({ tile: hit.tile })
          });
        }
      }
    }
    return out;
  }, [enabled, mode, items, textBoxes]);

  if (lines.length === 0) return null;

  return (
    <svg
      width={1}
      height={1}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        overflow: 'visible',
        pointerEvents: 'none'
      }}
    >
      {lines.map((l) => {
        return (
          <line
            key={l.key}
            data-testid="smart-guide"
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            stroke={GUIDE}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        );
      })}
    </svg>
  );
};
