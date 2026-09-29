import { useMemo } from 'react';
import { Button, Stack, Tooltip } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  ArrangeMember,
  ArrangeOp,
  planArrangement,
  sortByPosition
} from 'src/utils';
import type { ItemReference } from 'src/types';
import { Section } from './Section';

// align / distribute for a multi-selection, along the tile
// axes (see src/utils/arrange.ts). Each button is disabled, with the
// reason on hover, when its arrangement cannot apply.
const OPS: { op: ArrangeOp; label: string; hint: string }[] = [
  {
    op: 'ALIGN_X',
    label: 'Align X',
    hint: 'Put every item on the active item’s X line'
  },
  {
    op: 'ALIGN_Y',
    label: 'Align Y',
    hint: 'Put every item on the active item’s Y line'
  },
  {
    op: 'DISTRIBUTE_X',
    label: 'Distribute X',
    hint: 'Space the items evenly along X between the two ends'
  },
  {
    op: 'DISTRIBUTE_Y',
    label: 'Distribute Y',
    hint: 'Space the items evenly along Y between the two ends'
  }
];

export const ArrangeSection = ({
  selection
}: {
  selection: ItemReference[];
}) => {
  const { items, textBoxes, rectangles, applyMoves } = useScene();
  const anchor = useUiStateStore((state) => {
    return state.itemControls?.type === 'ADD_ITEM' ? null : state.itemControls;
  });

  const { members, otherNodeTiles } = useMemo(() => {
    const picked = new Set(
      selection.map((s) => {
        return `${s.type}:${s.id}`;
      })
    );
    const found: ArrangeMember[] = [];
    items.forEach((i) => {
      if (picked.has(`ITEM:${i.id}`)) {
        found.push({ ref: { type: 'ITEM', id: i.id }, at: i.tile });
      }
    });
    textBoxes.forEach((t) => {
      if (picked.has(`TEXTBOX:${t.id}`)) {
        found.push({ ref: { type: 'TEXTBOX', id: t.id }, at: t.tile });
      }
    });
    rectangles.forEach((r) => {
      if (picked.has(`RECTANGLE:${r.id}`)) {
        const s = sortByPosition([r.from, r.to]);
        found.push({
          ref: { type: 'RECTANGLE', id: r.id },
          at: { x: s.lowX, y: s.lowY }
        });
      }
    });
    return {
      members: found,
      otherNodeTiles: items
        .filter((i) => {
          return !picked.has(`ITEM:${i.id}`);
        })
        .map((i) => {
          return i.tile;
        })
    };
  }, [selection, items, textBoxes, rectangles]);

  if (members.length < 2) return null;

  return (
    <Section title="Arrange">
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        {OPS.map(({ op, label, hint }) => {
          const plan = planArrangement(op, members, anchor, otherNodeTiles);
          const reason = !plan
            ? op.startsWith('DISTRIBUTE') && members.length < 3
              ? 'Needs at least three items'
              : 'Would put two nodes on one tile'
            : hint;
          return (
            <Tooltip key={op} title={reason} describeChild placement="top">
              {/* span: a disabled button fires no hover events itself. */}
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!plan || plan.length === 0}
                  onClick={() => {
                    if (plan) applyMoves(plan);
                  }}
                >
                  {label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </Stack>
    </Section>
  );
};
