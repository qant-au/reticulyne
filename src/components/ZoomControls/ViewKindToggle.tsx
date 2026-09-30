import { useCallback } from 'react';
import { Stack, Divider } from '@mui/material';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { getTilePosition, screenToIso } from 'src/utils';
import type { Projection } from 'src/types';
import { Surface, ToolButton } from 'src/vendor/accurona-ui';

// lw-050: switch the current view between the isometric drawing and the
// flat, Visio-style 2D one. Both draw the same tiles, so nothing moves in
// the model; the tile at the centre of the canvas stays at the centre.
export const ViewKindToggle = () => {
  const { projection, setViewKind } = useScene();
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const switchTo = useCallback(
    (next: Projection) => {
      if (next === projection) return;
      const { zoom, scroll, rendererEl } = uiStateActions.get();
      const rect = rendererEl?.getBoundingClientRect();
      const rendererSize = {
        width: rect?.width ?? 0,
        height: rect?.height ?? 0
      };
      const centre = screenToIso({
        mouse: { x: rendererSize.width / 2, y: rendererSize.height / 2 },
        zoom,
        scroll,
        rendererSize,
        projection
      });
      setViewKind(next);
      const p = getTilePosition({ tile: centre, projection: next });
      uiStateActions.setScroll({
        position: { x: -p.x * zoom, y: -p.y * zoom },
        offset: scroll.offset
      });
    },
    [projection, setViewKind, uiStateActions]
  );

  return (
    <Surface>
      <Stack direction="row" data-testid="view-kind-toggle">
        <ToolButton
          name="Isometric view"
          icon={<ViewInArOutlinedIcon />}
          isActive={projection === 'iso'}
          onClick={() => {
            switchTo('iso');
          }}
        />
        <Divider orientation="vertical" flexItem />
        <ToolButton
          name="Flat 2D view"
          icon={<SchemaOutlinedIcon />}
          isActive={projection === 'schematic'}
          onClick={() => {
            switchTo('schematic');
          }}
        />
      </Stack>
    </Surface>
  );
};
