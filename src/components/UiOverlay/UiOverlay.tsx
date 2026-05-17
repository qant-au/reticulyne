// Top-level overlay container.
//
// Reads every piece of editor state that any overlay block needs,
// derives the `availableTools` allowlist from the current editor
// mode, and threads concrete props down to four focused children:
//
//   * ToolbarSlots — the four corner-positioned controls (MainMenu,
//     ToolMenu, ZoomControls, ItemControlsManager).
//   * TitleBar — the bottom-center title + current-view-name strip.
//   * DebugPanel — the optional bottom-left debug overlay.
//   * DialogLayer — the place-icon ghost, the export-image dialog,
//     and the context-menu anchor + manager.
//
// Split out under QUA4-10. EDITOR_MODE_MAPPING + getEditorModeMapping
// have moved to src/utils/editorModeMapping.ts.

import { useCallback, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { getEditorModeMapping } from 'src/utils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useModelStore } from 'src/stores/modelStore';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { ToolbarSlots } from './ToolbarSlots';
import { TitleBar } from './TitleBar';
import { DebugPanel } from './DebugPanel';
import { DialogLayer } from './DialogLayer';

export const UiOverlay = () => {
  const theme = useTheme();
  const { appPadding } = theme.customVars;
  const spacing = useCallback(
    (multiplier: number) => {
      return parseInt(theme.spacing(multiplier), 10);
    },
    [theme]
  );

  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const enableDebugTools = useUiStateStore((state) => {
    return state.enableDebugTools;
  });
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const mouse = useUiStateStore((state) => {
    return state.mouse;
  });
  const dialog = useUiStateStore((state) => {
    return state.dialog;
  });
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const showTitleBar = useUiStateStore((state) => {
    return state.showTitleBar;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });

  const { currentView } = useScene();
  const title = useModelStore((state) => {
    return state.title;
  });
  const { size: rendererSize } = useResizeObserver(rendererEl);

  const availableTools = useMemo(() => {
    return getEditorModeMapping(editorMode);
  }, [editorMode]);

  const onCloseDialog = useCallback(() => {
    uiStateActions.setDialog(null);
  }, [uiStateActions]);

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          width: 0,
          height: 0,
          top: 0,
          left: 0
        }}
      >
        <ToolbarSlots
          availableTools={availableTools}
          appPadding={appPadding}
          spacing={spacing}
          rendererSize={rendererSize}
          itemControls={itemControls}
        />
        <TitleBar
          visible={showTitleBar ?? availableTools.includes('VIEW_TITLE')}
          appPadding={appPadding}
          rendererSize={rendererSize}
          title={title}
          currentViewName={currentView.name ?? ''}
        />
        <DebugPanel
          visible={enableDebugTools}
          appPadding={appPadding}
          spacing={spacing}
          rendererSize={rendererSize}
        />
      </Box>
      <DialogLayer
        mode={mode}
        mouseTile={mouse.position.tile}
        dialog={dialog}
        onCloseDialog={onCloseDialog}
      />
    </>
  );
};
