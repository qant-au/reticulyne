// The three corner-positioned overlay controls — item-inspector
// (left-edge below MainMenu), zoom controls (bottom-left), and the
// combined main/tool menu (top-left). Each is gated by the
// availableTools array derived from the current editorMode, and by
// the existence of an active itemControls reference for the
// item-inspector slot.
//
// Pulled out of UiOverlay.tsx under QUA4-10 so the absolute-
// positioned blocks stop drowning out the top-level overlay shape.
// QUA4-11 merged the standalone top-right ToolMenu into MainMenu so
// both halves render as one horizontal cluster at top-left — single
// source of truth for "what can the user click in the chrome",
// aligns with the host app's left-aligned chrome conventions.
//
// Pure presentation: every slot reads from props.

import { Box } from '@mui/material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { ItemControlsManager } from 'src/components/ItemControls/ItemControlsManager';
import { MainMenu } from 'src/components/MainMenu/MainMenu';
import { ZoomControls } from 'src/components/ZoomControls/ZoomControls';
import { HelpButton } from 'src/components/HelpButton/HelpButton';
import type { ToolName } from 'src/utils';
import type { ItemControls } from 'src/types';
import type { Size } from 'src/types/common';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  availableTools: ToolName[];
  appPadding: AppPadding;
  spacing: (multiplier: number) => number;
  rendererSize: Size;
  itemControls: ItemControls | null;
}

export const ToolbarSlots = ({
  availableTools,
  appPadding,
  spacing,
  rendererSize,
  itemControls
}: Props) => {
  // The combined toolbar renders when EITHER half is active — i.e.
  // the host wants the hamburger (MAIN_MENU) and/or the tool buttons
  // (TOOL_MENU). MainMenu internally falls back to null when both
  // are off, but we still gate the wrapping Box so positioning math
  // stays predictable.
  const showHamburger = availableTools.includes('MAIN_MENU');
  const showToolButtons = availableTools.includes('TOOL_MENU');
  const showCombinedToolbar = showHamburger || showToolButtons;

  return (
    <>
      {availableTools.includes('ITEM_CONTROLS') && itemControls && (
        <UiElement
          sx={{
            position: 'absolute',
            width: '360px',
            overflowY: 'scroll',
            '&::-webkit-scrollbar': {
              display: 'none'
            }
          }}
          style={{
            left: appPadding.x,
            top: appPadding.y * 2 + spacing(2),
            maxHeight: rendererSize.height - appPadding.y * 6
          }}
        >
          <ItemControlsManager />
        </UiElement>
      )}

      {availableTools.includes('ZOOM_CONTROLS') && (
        <Box
          sx={{
            position: 'absolute',
            transformOrigin: 'bottom left'
          }}
          style={{
            top: rendererSize.height - appPadding.y * 2,
            left: appPadding.x
          }}
        >
          <ZoomControls />
        </Box>
      )}

      {showCombinedToolbar && (
        <Box
          sx={{
            position: 'absolute'
          }}
          style={{
            top: appPadding.y,
            left: appPadding.x
          }}
        >
          <MainMenu showToolButtons={showToolButtons} />
        </Box>
      )}

      <Box
        sx={{ position: 'absolute', transformOrigin: 'bottom right' }}
        style={{
          top: rendererSize.height - appPadding.y * 2,
          right: appPadding.x
        }}
      >
        <HelpButton />
      </Box>
    </>
  );
};
