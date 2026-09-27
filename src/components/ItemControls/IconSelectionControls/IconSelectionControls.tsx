import { useCallback } from 'react';
import { Stack, Alert } from '@mui/material';
import { ControlsContainer } from 'src/components/ItemControls/components/ControlsContainer';
import { Header } from 'src/components/ItemControls/components/Header';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Icon } from 'src/types';
import { useScene } from 'src/hooks/useScene';
import { generateId } from 'src/utils';
import { VIEW_ITEM_DEFAULTS } from 'src/config';
import { Section } from 'src/components/ItemControls/components/Section';
import { Searchbox } from 'src/components/ItemControls/IconSelectionControls/Searchbox';
import { useIconFiltering } from 'src/hooks/useIconFiltering';
import { useIconCategories } from 'src/hooks/useIconCategories';
import { Icons } from './Icons';
import { IconGrid } from './IconGrid';
import { UploadIconButton } from './UploadIconButton';

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

  return (
    <ControlsContainer
      header={
        <>
          <Header title={title} />
          <Section sx={{ pt: 0, pb: 3 }}>
            <Stack spacing={2}>
              <Searchbox value={filter} onChange={setFilter} />
              <Alert severity="info">
                You can drag and drop any item below onto the canvas.
              </Alert>
              <UploadIconButton />
            </Stack>
          </Section>
        </>
      }
    >
      {filteredIcons && (
        <Section>
          <IconGrid icons={filteredIcons} onMouseDown={onMouseDown} />
        </Section>
      )}
      {!filteredIcons && (
        <Icons iconCategories={iconCategories} onMouseDown={onMouseDown} />
      )}
    </ControlsContainer>
  );
};
