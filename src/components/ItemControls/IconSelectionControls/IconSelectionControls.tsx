import { useCallback } from 'react';
import { Stack, Alert, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Icon } from 'src/types';
import { useScene } from 'src/hooks/useScene';
import { generateId } from 'src/utils';
import { DEFAULT_ICON, VIEW_ITEM_DEFAULTS } from 'src/config';
import { Searchbox } from 'src/components/ItemControls/IconSelectionControls/Searchbox';
import { useIconFiltering } from 'src/hooks/useIconFiltering';
import { useKeyboardPlacement } from 'src/hooks/useKeyboardPlacement';
import { useIconCategories } from 'src/hooks/useIconCategories';
import { Icons } from './Icons';
import { IconGrid } from './IconGrid';
import { UploadIconButton } from './UploadIconButton';
import { FloorPlanObjects, type FloorPlanObject } from './FloorPlanObjects';
import { CatalogueItems } from './CatalogueItems';
import { useModelStore } from 'src/stores/modelStore';
import { catalogueTemplate } from 'src/scene/crossover';
import type { CatalogueItem } from 'src/catalogue/schema';
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
  const { placeIcon } = useKeyboardPlacement();
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

  // A click with no press before it came from the keyboard (Enter
  // or Space on the icon). A pointer arms the icon on press and places it
  // where it is released; the keyboard has nowhere to release, so the icon
  // goes straight onto the free tile nearest the middle of the view.
  const onClick = useCallback(
    (icon: Icon) => {
      // Read at click time: the press before it may just have armed it.
      const current = uiStateActions.get().mode;
      if (current.type !== 'PLACE_ICON' && !armFromAnyMode) return;
      if (current.type === 'PLACE_ICON' && current.id === icon.id) return;
      placeIcon(icon.id, undefined, armFromAnyMode ? undefined : targetTile);
    },
    [uiStateActions, armFromAnyMode, placeIcon, targetTile]
  );

  // A device from the floor plan is placed like an icon, but as
  // the object it already is.
  const onFloorPlanObject = useCallback(
    (object: FloorPlanObject) => {
      if (mode.type !== 'PLACE_ICON' && !armFromAnyMode) return;

      if (targetTile && !armFromAnyMode) {
        createModelItem({ ...object.template, id: object.id });
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
        object: { id: object.id, name: object.name, icon: object.icon },
        template: object.template
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

  // A catalogue item places like an icon, but as a new object with
  // the item's ports, links and element each time.
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const onCatalogueMouseDown = useCallback(
    (item: CatalogueItem) => {
      if (mode.type !== 'PLACE_ICON' && !armFromAnyMode) return;
      const template = catalogueTemplate(item, icons);

      if (targetTile && !armFromAnyMode) {
        const id = generateId();
        createModelItem({ ...template, id });
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
        id: template.icon ?? DEFAULT_ICON.id,
        template
      });
    },
    [
      mode,
      uiStateActions,
      targetTile,
      createModelItem,
      createViewItem,
      armFromAnyMode,
      icons
    ]
  );

  const onCatalogueClick = useCallback(
    (item: CatalogueItem) => {
      const current = uiStateActions.get().mode;
      if (current.type !== 'PLACE_ICON' && !armFromAnyMode) return;
      const template = catalogueTemplate(item, icons);
      // The press before it armed this same item: the pointer places it.
      if (
        current.type === 'PLACE_ICON' &&
        current.template?.links?.[0]?.ref === item.id
      ) {
        return;
      }
      placeIcon(
        template.icon ?? DEFAULT_ICON.id,
        undefined,
        armFromAnyMode ? undefined : targetTile,
        template
      );
    },
    [uiStateActions, armFromAnyMode, placeIcon, targetTile, icons]
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
      <CatalogueItems
        filter={filter}
        onMouseDown={onCatalogueMouseDown}
        onClick={onCatalogueClick}
      />
      {filteredIcons && (
        <PanelSection>
          {filteredIcons.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No icons match “{filter}”.
            </Typography>
          ) : (
            <IconGrid
              icons={filteredIcons}
              onMouseDown={onMouseDown}
              onClick={onClick}
            />
          )}
        </PanelSection>
      )}
      {!filteredIcons && (
        <Icons
          iconCategories={iconCategories}
          onMouseDown={onMouseDown}
          onClick={onClick}
        />
      )}
    </Panel>
  );
};
