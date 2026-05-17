// The four corner-positioned overlay controls — item-inspector
// (left-edge below MainMenu), tool menu (top-right), zoom controls
// (bottom-left), and main menu (top-left). Each is gated by the
// availableTools array derived from the current editorMode, and by
// the existence of an active itemControls reference for the
// item-inspector slot.
//
// Pulled out of UiOverlay.tsx under QUA4-10 so the four absolute-
// positioned blocks stop drowning out the top-level overlay shape.
// Pure presentation: every slot reads from props.

import { Box } from '@mui/material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { ItemControlsManager } from 'src/components/ItemControls/ItemControlsManager';
import { ToolMenu } from 'src/components/ToolMenu/ToolMenu';
import { MainMenu } from 'src/components/MainMenu/MainMenu';
import { ZoomControls } from 'src/components/ZoomControls/ZoomControls';
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

      {availableTools.includes('TOOL_MENU') && (
        <Box
          sx={{
            position: 'absolute',
            transform: 'translateX(-100%)'
          }}
          style={{
            left: rendererSize.width - appPadding.x,
            top: appPadding.y
          }}
        >
          <ToolMenu />
        </Box>
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

      {availableTools.includes('MAIN_MENU') && (
        <Box
          sx={{
            position: 'absolute'
          }}
          style={{
            top: appPadding.y,
            left: appPadding.x
          }}
        >
          <MainMenu />
        </Box>
      )}
    </>
  );
};
