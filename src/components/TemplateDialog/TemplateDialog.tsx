import {
  Box,
  Card,
  CardActionArea,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme
} from '@mui/material';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { getTilePosition } from 'src/utils';
import { templateToInitialData, type DiagramTemplate } from 'src/templates';
import type { Coords } from 'src/types';

// "New from template". Picking one replaces the diagram, the
// same as Open does with a file.
const W = 200;
const H = 110;
const PAD = 70;

const TemplatePreview = ({ template }: { template: DiagramTemplate }) => {
  const theme = useTheme();
  const view = template.views[0];
  const tiles = new Map(
    (view?.items ?? []).map((i) => {
      return [i.id, getTilePosition({ tile: i.tile })];
    })
  );
  const rects = (view?.rectangles ?? []).map((r) => {
    return {
      id: r.id,
      colour: r.colorValue ?? theme.palette.grey[400],
      corners: [
        r.from,
        { x: r.to.x, y: r.from.y },
        r.to,
        { x: r.from.x, y: r.to.y }
      ].map((t) => {
        return getTilePosition({ tile: t });
      })
    };
  });
  const pts = [
    ...tiles.values(),
    ...rects.flatMap((r) => {
      return r.corners;
    })
  ];
  if (pts.length === 0) {
    return <Box sx={{ height: H }} />;
  }
  const xs = pts.map((p) => {
    return p.x;
  });
  const ys = pts.map((p) => {
    return p.y;
  });
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const w = Math.max(...xs) + PAD - minX;
  const h = Math.max(...ys) + PAD - minY;
  const scale = Math.min(W / w, H / h);
  const at = (p: Coords) => {
    return {
      x: (p.x - minX) * scale + (W - w * scale) / 2,
      y: (p.y - minY) * scale + (H - h * scale) / 2
    };
  };

  return (
    <svg width={W} height={H} aria-hidden style={{ display: 'block' }}>
      {rects.map((r) => {
        return (
          <polygon
            key={r.id}
            points={r.corners
              .map((c) => {
                const m = at(c);
                return `${m.x},${m.y}`;
              })
              .join(' ')}
            fill={r.colour}
            fillOpacity={0.5}
          />
        );
      })}
      {(view?.connectors ?? []).map((c) => {
        const [a, b] = c.anchors.map((anchor) => {
          return anchor.ref.item ? tiles.get(anchor.ref.item) : undefined;
        });
        if (!a || !b) return null;
        const p = at(a);
        const q = at(b);
        return (
          <line
            key={c.id}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={theme.palette.text.secondary}
            strokeWidth={1.5}
          />
        );
      })}
      {[...tiles.entries()].map(([id, p]) => {
        const m = at(p);
        return (
          <circle
            key={id}
            cx={m.x}
            cy={m.y}
            r={5}
            fill={theme.palette.primary.main}
          />
        );
      })}
    </svg>
  );
};

interface Props {
  onClose: () => void;
}

export const TemplateDialog = ({ onClose }: Props) => {
  const templates = useUiStateStore((state) => {
    return state.templates;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const { load } = useInitialDataManager();

  const choose = (template: DiagramTemplate) => {
    const { icons, colors } = modelActions.get();
    // Reset first: load() fits the new diagram to the view, and a reset
    // afterwards would put the zoom back to 100%.
    uiStateActions.resetUiState();
    load(templateToInitialData(template, icons, colors));
    uiStateActions.get().onDiagramReplaced?.();
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>New from template</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Replaces the current diagram. Export it first if you want to keep it.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 2
          }}
        >
          {templates.map((template) => {
            return (
              <Card key={template.id} variant="outlined">
                <CardActionArea
                  aria-label={template.name}
                  onClick={() => {
                    choose(template);
                  }}
                  sx={{ p: 1.5, height: '100%', alignItems: 'flex-start' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <TemplatePreview template={template} />
                  </Box>
                  <Typography variant="subtitle2">{template.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {template.description}
                  </Typography>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
