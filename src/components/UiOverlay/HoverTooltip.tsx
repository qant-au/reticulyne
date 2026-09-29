import { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import { getItemAtTile } from 'src/utils';
import { usePointerOverCanvas } from 'src/hooks/usePointerOverCanvas';

// rest the pointer on an item and, after a moment, its name
// and the start of its description appear beside it. Useful in read-only
// embeds, where there is no inspector to open. Shown only for the cursor
// and hand tools with no button held, so it never sits over a drag.
const DELAY_MS = 600;
const SNIPPET = 140;

// Descriptions are rich-text HTML. Parse to plain text and render it as
// text: nothing from the model is ever inserted as markup here.
const toPlainText = (html: string | undefined) => {
  if (!html) return '';
  const text =
    new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET - 1)}…` : flat;
};

export const HoverTooltip = () => {
  const modeType = useUiStateStore((state) => {
    return state.mode.type;
  });
  const mouse = useUiStateStore((state) => {
    return state.mouse;
  });
  const modelItems = useModelStore((state) => {
    return state.items;
  });
  const scene = useScene();
  const overCanvas = usePointerOverCanvas();

  const eligible =
    overCanvas &&
    (modeType === 'CURSOR' || modeType === 'PAN') &&
    !mouse.mousedown;

  const hovered = useMemo(() => {
    if (!eligible) return null;
    const ref = getItemAtTile({ tile: mouse.position.tile, scene });
    if (!ref) return null;
    if (ref.type === 'ITEM') {
      const item = modelItems.find((i) => {
        return i.id === ref.id;
      });
      return item
        ? { key: `ITEM:${item.id}`, title: item.name, body: item.description }
        : null;
    }
    if (ref.type === 'CONNECTOR') {
      const connector = scene.connectors.find((c) => {
        return c.id === ref.id;
      });
      return connector?.description
        ? {
            key: `CONNECTOR:${connector.id}`,
            title: 'Connector',
            body: connector.description
          }
        : null;
    }
    return null;
  }, [eligible, mouse.position.tile, scene, modelItems]);

  const [shownKey, setShownKey] = useState<string | null>(null);
  useEffect(() => {
    if (!hovered) return undefined;
    const timer = setTimeout(() => {
      setShownKey(hovered.key);
    }, DELAY_MS);
    return () => {
      clearTimeout(timer);
      // Leaving the item hides it, so coming back waits the delay again.
      setShownKey(null);
    };
  }, [hovered?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hovered || shownKey !== hovered.key) return null;
  const snippet = toPlainText(hovered.body);

  return (
    <Box
      role="tooltip"
      data-testid="hover-tooltip"
      sx={{
        position: 'absolute',
        left: mouse.position.screen.x + 14,
        top: mouse.position.screen.y + 18,
        // The overlay container is 0x0, so without an explicit width the
        // box shrinks to its longest word and wraps one word per line.
        width: 'max-content',
        maxWidth: 280,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 3,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary' }}
      >
        {hovered.title}
      </Typography>
      {snippet && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {snippet}
        </Typography>
      )}
    </Box>
  );
};
