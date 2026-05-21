import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, Typography, Divider, Card, Stack } from '@mui/material';
import {
  Menu as MenuIcon,
  GitHub as GitHubIcon,
  DataObject as ExportJsonIcon,
  ImageOutlined as ExportImageIcon,
  PictureAsPdfOutlined as ExportPdfIcon,
  FolderOpen as FolderOpenIcon,
  DeleteOutlined as DeleteOutlineIcon,
  SaveOutlined as SaveIcon,
  PanToolOutlined as PanToolIcon,
  NearMeOutlined as NearMeIcon,
  AddOutlined as AddIcon,
  EastOutlined as ConnectorIcon,
  CropSquareOutlined as CropSquareIcon,
  Title as TitleIcon
} from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { IconButton } from 'src/components/IconButton/IconButton';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useScene } from 'src/hooks/useScene';
import { TEXTBOX_DEFAULTS } from 'src/config';
import { generateId } from 'src/utils';
import { MenuItem } from './MenuItem';
import { useImportFile } from './useImportFile';
import { useExportJson } from './useExportJson';
import { useExportPdf } from './useExportPdf';
import { useSaveModel } from './useSaveModel';
import { useSectionVisibility } from './useSectionVisibility';

interface Props {
  /**
   * Render the six edit-mode tool buttons (Select / Pan / Add item /
   * Rectangle / Connector / Text) inline after the hamburger. Caller
   * (ToolbarSlots) passes this from `availableTools.includes('TOOL_MENU')`
   * so editor-mode gating still works without a separate TOOL_MENU slot.
   */
  showToolButtons?: boolean;
}

export const MainMenu = ({ showToolButtons = false }: Props = {}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMainMenuOpen = useUiStateStore((state) => {
    return state.isMainMenuOpen;
  });
  const mainMenuOptions = useUiStateStore((state) => {
    return state.mainMenuOptions;
  });
  const onSave = useUiStateStore((state) => {
    return state.onSave;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const mousePosition = useUiStateStore((state) => {
    return state.mouse.position.tile;
  });
  const { clear } = useInitialDataManager();
  const { createTextBox } = useScene();

  const onOpenModel = useImportFile();
  const onExportAsJSON = useExportJson();
  const onExportAsPdf = useExportPdf();
  const onSaveModel = useSaveModel();
  const sectionVisibility = useSectionVisibility();

  // FEA5-03: warn when the host opts into the Save entry without
  // wiring the callback. The entry is suppressed below regardless,
  // but the diagnostic helps the host notice the misconfiguration.
  const warnedMissingOnSaveRef = useRef(false);
  useEffect(() => {
    if (
      mainMenuOptions.includes('ACTION.SAVE') &&
      !onSave &&
      !warnedMissingOnSaveRef.current
    ) {
      warnedMissingOnSaveRef.current = true;
      console.warn(
        '[isoflow] mainMenuOptions includes "ACTION.SAVE" but no onSave callback ' +
          'was passed to <Isoflow>. The Save menu entry will not render until both ' +
          'are wired.'
      );
    }
  }, [mainMenuOptions, onSave]);

  const onToggleMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
      uiStateActions.setIsMainMenuOpen(true);
    },
    [uiStateActions]
  );

  const gotoUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const onExportAsImage = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EXPORT_IMAGE');
  }, [uiStateActions]);

  const onClearCanvas = useCallback(() => {
    clear();
    uiStateActions.setIsMainMenuOpen(false);
  }, [uiStateActions, clear]);

  const createTextBoxProxy = useCallback(() => {
    const textBoxId = generateId();

    createTextBox({
      ...TEXTBOX_DEFAULTS,
      id: textBoxId,
      tile: mousePosition
    });

    uiStateActions.setMode({
      type: 'TEXTBOX',
      showCursor: false,
      id: textBoxId
    });
  }, [uiStateActions, createTextBox, mousePosition]);

  const hasMainMenu = mainMenuOptions.length > 0;

  // Nothing to render if the host disabled both halves of the combined
  // toolbar. (Previously MainMenu returned null when mainMenuOptions was
  // empty; now we also need to handle the tools-only and tools-off case.)
  if (!hasMainMenu && !showToolButtons) {
    return null;
  }

  return (
    <UiElement>
      <Stack direction="row">
        {hasMainMenu && (
          <IconButton
            Icon={<MenuIcon />}
            name="Main menu"
            onClick={onToggleMenu}
          />
        )}
        {showToolButtons && (
          <>
            <IconButton
              name="Select (V)"
              Icon={<NearMeIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'CURSOR',
                  showCursor: true,
                  mousedownItem: null
                });
              }}
              isActive={mode.type === 'CURSOR' || mode.type === 'DRAG_ITEMS'}
            />
            <IconButton
              name="Pan (H)"
              Icon={<PanToolIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'PAN',
                  showCursor: false
                });
                uiStateActions.setItemControls(null);
              }}
              isActive={mode.type === 'PAN'}
            />
            <IconButton
              name="Add item (A)"
              Icon={<AddIcon />}
              onClick={() => {
                uiStateActions.setItemControls({
                  type: 'ADD_ITEM'
                });
                uiStateActions.setMode({
                  type: 'PLACE_ICON',
                  showCursor: true,
                  id: null
                });
              }}
              isActive={mode.type === 'PLACE_ICON'}
            />
            <IconButton
              name="Rectangle (R)"
              Icon={<CropSquareIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'RECTANGLE.DRAW',
                  showCursor: true,
                  id: null
                });
              }}
              isActive={mode.type === 'RECTANGLE.DRAW'}
            />
            <IconButton
              name="Connector (C)"
              Icon={<ConnectorIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'CONNECTOR',
                  id: null,
                  showCursor: true
                });
              }}
              isActive={mode.type === 'CONNECTOR'}
            />
            <IconButton
              name="Text (T)"
              Icon={<TitleIcon />}
              onClick={createTextBoxProxy}
              isActive={mode.type === 'TEXTBOX'}
            />
          </>
        )}
      </Stack>
      {hasMainMenu && (
        <Menu
          anchorEl={anchorEl}
          open={isMainMenuOpen}
          onClose={() => {
            uiStateActions.setIsMainMenuOpen(false);
          }}
          elevation={0}
          sx={{
            mt: 2
          }}
          slotProps={{
            list: {
              sx: {
                minWidth: '250px',
                py: 0
              }
            }
          }}
        >
          <Card sx={{ py: 1 }}>
            {mainMenuOptions.includes('ACTION.OPEN') && (
              <MenuItem onClick={onOpenModel} Icon={<FolderOpenIcon />}>
                Open
              </MenuItem>
            )}

            {mainMenuOptions.includes('ACTION.SAVE') && onSave && (
              <MenuItem onClick={onSaveModel} Icon={<SaveIcon />}>
                Save
              </MenuItem>
            )}

            {mainMenuOptions.includes('EXPORT.JSON') && (
              <MenuItem onClick={onExportAsJSON} Icon={<ExportJsonIcon />}>
                Export as JSON
              </MenuItem>
            )}

            {mainMenuOptions.includes('EXPORT.PNG') && (
              <MenuItem onClick={onExportAsImage} Icon={<ExportImageIcon />}>
                Export as Image
              </MenuItem>
            )}

            {mainMenuOptions.includes('EXPORT.PDF') && (
              <MenuItem onClick={onExportAsPdf} Icon={<ExportPdfIcon />}>
                Export as PDF
              </MenuItem>
            )}

            {mainMenuOptions.includes('ACTION.CLEAR_CANVAS') && (
              <MenuItem onClick={onClearCanvas} Icon={<DeleteOutlineIcon />}>
                Clear
              </MenuItem>
            )}

            {sectionVisibility.links && (
              <>
                <Divider />

                {mainMenuOptions.includes('LINK.GITHUB') && (
                  <MenuItem
                    onClick={() => {
                      return gotoUrl(`${REPOSITORY_URL}`);
                    }}
                    Icon={<GitHubIcon />}
                  >
                    GitHub
                  </MenuItem>
                )}
              </>
            )}

            {sectionVisibility.version && (
              <>
                <Divider />

                {mainMenuOptions.includes('VERSION') && (
                  <MenuItem>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary'
                      }}
                    >
                      Isoflow v{PACKAGE_VERSION}
                    </Typography>
                  </MenuItem>
                )}
              </>
            )}
          </Card>
        </Menu>
      )}
    </UiElement>
  );
};
