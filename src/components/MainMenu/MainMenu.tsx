import { useState, useCallback, useEffect, useRef } from 'react';
import { Typography, Stack, DialogContentText, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import ExportJsonIcon from '@mui/icons-material/DataObject';
import ExportImageIcon from '@mui/icons-material/PhotoOutlined';
import ExportPdfIcon from '@mui/icons-material/ArticleOutlined';
import ExportSvgIcon from '@mui/icons-material/PolylineOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import PanToolIcon from '@mui/icons-material/PanToolOutlined';
import NearMeIcon from '@mui/icons-material/NearMeOutlined';
import AddIcon from '@mui/icons-material/AddOutlined';
import ConnectorIcon from '@mui/icons-material/EastOutlined';
import CropSquareIcon from '@mui/icons-material/CropSquareOutlined';
import TitleIcon from '@mui/icons-material/Title';
import RenameIcon from '@mui/icons-material/DriveFileRenameOutline';
import LibraryIcon from '@mui/icons-material/CategoryOutlined';
import NewFromTemplateIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useScene } from 'src/hooks/useScene';
import { TEXTBOX_DEFAULTS } from 'src/config';
import { generateId } from 'src/utils';
import { useImportFile } from './useImportFile';
import { useExportJson } from './useExportJson';
import { useExportPdf } from './useExportPdf';
import { useSaveModel } from './useSaveModel';
import { useSectionVisibility } from './useSectionVisibility';
import { shortcutHint } from 'src/vendor/accurona-core';
import { KEYMAP } from 'src/interaction/useKeyboardShortcuts';
import {
  AppDialog,
  Surface,
  ToolButton,
  ToolMenu,
  type ToolMenuItem
} from 'src/vendor/accurona-ui';

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
  const isMainMenuOpen = useUiStateStore((state) => {
    return state.isMainMenuOpen;
  });
  const iconPaletteOpen = useUiStateStore((state) => {
    return state.iconPaletteOpen;
  });
  const mainMenuOptions = useUiStateStore((state) => {
    return state.mainMenuOptions;
  });
  const templates = useUiStateStore((state) => {
    return state.templates;
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
        '[reticulyne] mainMenuOptions includes "ACTION.SAVE" but no onSave callback ' +
          'was passed to <Reticulyne>. The Save menu entry will not render until both ' +
          'are wired.'
      );
    }
  }, [mainMenuOptions, onSave]);

  const gotoUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const onExportAsImage = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EXPORT_IMAGE');
  }, [uiStateActions]);

  const onRename = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('RENAME_DIAGRAM');
  }, [uiStateActions]);

  const onNewFromTemplate = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('NEW_FROM_TEMPLATE');
  }, [uiStateActions]);

  const onExportAsSvg = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    uiStateActions.setDialog('EXPORT_SVG');
  }, [uiStateActions]);

  // Clear empties the whole diagram and a load cannot be undone, so it
  // asks first, as Excalidraw's "Reset the canvas" does.
  const [confirmClear, setConfirmClear] = useState(false);
  const onClearCanvas = useCallback(() => {
    uiStateActions.setIsMainMenuOpen(false);
    setConfirmClear(true);
  }, [uiStateActions]);
  const onConfirmClear = useCallback(() => {
    setConfirmClear(false);
    clear();
    uiStateActions.get().onDiagramReplaced?.();
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

  const has = (option: (typeof mainMenuOptions)[number]) => {
    return mainMenuOptions.includes(option);
  };
  const menuItems: ToolMenuItem[] = [
    ...(has('ACTION.OPEN')
      ? [{ label: 'Open', icon: <FolderOpenIcon />, onClick: onOpenModel }]
      : []),
    ...(has('ACTION.NEW_FROM_TEMPLATE') && templates.length > 0
      ? [
          {
            label: 'New from template',
            icon: <NewFromTemplateIcon />,
            onClick: onNewFromTemplate
          }
        ]
      : []),
    ...(has('ACTION.SAVE') && onSave
      ? [{ label: 'Save', icon: <SaveIcon />, onClick: onSaveModel }]
      : []),
    ...(has('ACTION.RENAME')
      ? [{ label: 'Rename diagram', icon: <RenameIcon />, onClick: onRename }]
      : []),
    ...(has('EXPORT.JSON')
      ? [
          {
            label: 'Export as JSON',
            icon: <ExportJsonIcon />,
            onClick: onExportAsJSON
          }
        ]
      : []),
    ...(has('EXPORT.PNG')
      ? [
          {
            label: 'Export as Image',
            icon: <ExportImageIcon />,
            onClick: onExportAsImage
          }
        ]
      : []),
    ...(has('EXPORT.PDF')
      ? [
          {
            label: 'Export as PDF',
            icon: <ExportPdfIcon />,
            onClick: onExportAsPdf
          }
        ]
      : []),
    ...(has('EXPORT.SVG')
      ? [
          {
            label: 'Export as SVG',
            icon: <ExportSvgIcon />,
            onClick: onExportAsSvg
          }
        ]
      : []),
    ...(has('ACTION.CLEAR_CANVAS')
      ? [
          {
            label: 'Clear',
            icon: <DeleteOutlineIcon />,
            onClick: onClearCanvas
          }
        ]
      : []),
    ...(sectionVisibility.links && has('LINK.GITHUB')
      ? [
          {
            label: 'GitHub',
            icon: <GitHubIcon />,
            divider: true,
            onClick: () => {
              gotoUrl(`${REPOSITORY_URL}`);
            }
          }
        ]
      : [])
  ];
  const showVersion = sectionVisibility.version && has('VERSION');

  const hasMainMenu = mainMenuOptions.length > 0;

  // Nothing to render if the host disabled both halves of the combined
  // toolbar. (Previously MainMenu returned null when mainMenuOptions was
  // empty; now we also need to handle the tools-only and tools-off case.)
  if (!hasMainMenu && !showToolButtons) {
    return null;
  }

  return (
    <Surface>
      <Stack direction="row">
        {hasMainMenu && (
          <ToolMenu
            name="Main menu"
            icon={<MenuIcon />}
            openOnHover={false}
            placement="bottom-start"
            offset={16}
            minWidth={250}
            open={isMainMenuOpen}
            onOpenChange={uiStateActions.setIsMainMenuOpen}
            items={menuItems}
            footer={
              showVersion && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Reticulyne v{PACKAGE_VERSION}
                </Typography>
              )
            }
          />
        )}
        {showToolButtons && (
          <>
            <ToolButton
              name={`Select (${shortcutHint(KEYMAP, 'select')})`}
              icon={<NearMeIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'CURSOR',
                  showCursor: true,
                  mousedownItem: null
                });
              }}
              isActive={mode.type === 'CURSOR' || mode.type === 'DRAG_ITEMS'}
            />
            <ToolButton
              name={`Pan (${shortcutHint(KEYMAP, 'hand')})`}
              icon={<PanToolIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'PAN',
                  showCursor: false
                });
                uiStateActions.setItemControls(null);
              }}
              isActive={mode.type === 'PAN'}
            />
            <ToolButton
              name={`Add item (${shortcutHint(KEYMAP, 'add-item')})`}
              icon={<AddIcon />}
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
            <ToolButton
              name={`Rectangle (${shortcutHint(KEYMAP, 'rectangle')})`}
              icon={<CropSquareIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'RECTANGLE.DRAW',
                  showCursor: true,
                  id: null
                });
              }}
              isActive={mode.type === 'RECTANGLE.DRAW'}
            />
            <ToolButton
              name={`Connector (${shortcutHint(KEYMAP, 'connector')})`}
              icon={<ConnectorIcon />}
              onClick={() => {
                uiStateActions.setMode({
                  type: 'CONNECTOR',
                  id: null,
                  showCursor: true
                });
              }}
              isActive={mode.type === 'CONNECTOR'}
            />
            <ToolButton
              name={`Text (${shortcutHint(KEYMAP, 'text')})`}
              icon={<TitleIcon />}
              onClick={createTextBoxProxy}
              isActive={mode.type === 'TEXTBOX'}
            />
            <ToolButton
              name="Icon library"
              icon={<LibraryIcon />}
              onClick={() => {
                uiStateActions.setIconPaletteOpen(!iconPaletteOpen);
              }}
              isActive={iconPaletteOpen}
            />
          </>
        )}
      </Stack>
      <AppDialog
        open={confirmClear}
        onClose={() => {
          setConfirmClear(false);
        }}
        title="Clear the canvas?"
        actions={
          <>
            <Button
              variant="text"
              onClick={() => {
                setConfirmClear(false);
              }}
            >
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={onConfirmClear}>
              Clear
            </Button>
          </>
        }
      >
        <DialogContentText>
          Everything in this diagram is removed. This cannot be undone.
        </DialogContentText>
      </AppDialog>
    </Surface>
  );
};
