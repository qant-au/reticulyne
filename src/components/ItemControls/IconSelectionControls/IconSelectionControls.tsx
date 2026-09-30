import { useCallback } from 'react';
import { Stack, Alert, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Icon } from 'src/types';
import { useScene } from 'src/hooks/useScene';
import { generateId } from 'src/utils';
import { DEFAULT_ICON, VIEW_ITEM_DEFAULTS } from 'src/config';
import { Searchbox } from 'src/components/ItemControls/IconSelectionControls/Searchbox';
import { useIconFiltering } from 'src/hooks/useIconFiltering';
import { useIconCategories } from 'src/hooks/useIconCategories';
import { Icons } from './Icons';
import { IconGrid } from './IconGrid';
import { UploadIconButton } from './UploadIconButton';
import { FloorPlanObjects, type FloorPlanObject } from './FloorPlanObjects';
import { Panel, PanelHeader, PanelSection } from 'src/vendor/accurona-ui';

interface Props {
  /** Header text. */
  title?: string;
  /**
   * 2.11: the persistent icon palette arms an icon from whatever tool is
   * active; the add-item picker only works inside its own PLACE_ICON mode.
   */
  armFromAnyMode?: boolean;
}

export const IconSelectionControls = ({
  title = 'Add object',
  armFromAnyMode = false
}: Props = {}) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  // 2.2: a picker opened by double-clicking a tile carries that tile.
  const targetTile = useUiStateStore((state) => {
    return state.itemControls?.type === 'ADD_ITEM'
      ? state.itemControls.tile
      : undefined;
  });
  const { createModelItem, createViewItem } = useScene();
  const { setFilter, filteredIcons, filter } = useIconFiltering();
  const { iconCategories } = useIconCategories();

  const onMouseDown = useCallback(
    (icon: Icon) => {
      if (mode.type !== 'PLACE_ICON' && !armFromAnyMode) return;

      if (targetTile && !armFromAnyMode) {
        // Place it now (same shape PlaceIcon.mouseup commits), select it,
        // and return to the cursor tool.
        const id = generateId();
        createModelItem({ id, name: 'Untitled', icon: icon.id });
        createViewItem({ ...VIEW_ITEM_DEFAULTS, id, tile: targetTile });
        uiStateActions.setMode({
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: null
        });
        uiStateActions.setSelection([{ type: 'ITEM', id }]);
        return;
      }

      uiStateActions.setMode({
        type: 'PLACE_ICON',
        showCursor: true,
        id: icon.id
      });
    },
    [
      mode,
      uiStateActions,
      targetTile,
      createModelItem,
      createViewItem,
      armFromAnyMode
    ]
  );

  // lw-055: a device from the floor plan is placed like an icon, but as
  // the object it already is.
  const onFloorPlanObject = useCallback(
    (object: FloorPlanObject) => {
      if (mode.type !== 'PLACE_ICON' && !armFromAnyMode) return;

      if (targetTile && !armFromAnyMode) {
        createModelItem({
          id: object.id,
          name: object.name,
          icon: object.icon
        });
        createViewItem({
          ...VIEW_ITEM_DEFAULTS,
          id: object.id,
          tile: targetTile
        });
        uiStateActions.setMode({
          type: 'CURSOR',
          showCursor: true,
          mousedownItem: null
        });
        uiStateActions.setSelection([{ type: 'ITEM', id: object.id }]);
        return;
      }

      uiStateActions.setMode({
        type: 'PLACE_ICON',
        showCursor: true,
        id: object.icon ?? DEFAULT_ICON.id,
        object
      });
    },
    [
      mode,
      uiStateActions,
      targetTile,
      createModelItem,
      createViewItem,
      armFromAnyMode
    ]
  );

  return (
    <Panel
      header={
        <>
          <PanelHeader title={title} />
          <PanelSection sx={{ pt: 0, pb: 3 }}>
            <Stack spacing={2}>
              <Searchbox value={filter} onChange={setFilter} />
              <Alert severity="info">
                You can drag and drop any item below onto the canvas.
              </Alert>
              <UploadIconButton />
            </Stack>
          </PanelSection>
        </>
      }
    >
      {!filteredIcons && <FloorPlanObjects onMouseDown={onFloorPlanObject} />}
      {filteredIcons && (
        <PanelSection>
          {filteredIcons.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No icons match “{filter}”.
            </Typography>
          ) : (
            <IconGrid icons={filteredIcons} onMouseDown={onMouseDown} />
          )}
        </PanelSection>
      )}
      {!filteredIcons && (
        <Icons iconCategories={iconCategories} onMouseDown={onMouseDown} />
      )}
    </Panel>
  );
};
