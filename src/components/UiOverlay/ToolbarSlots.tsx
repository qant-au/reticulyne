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

import { Box, Stack } from '@mui/material';
import { ItemControlsManager } from 'src/components/ItemControls/ItemControlsManager';
import { MainMenu } from 'src/components/MainMenu/MainMenu';
import { ZoomControls } from 'src/components/ZoomControls/ZoomControls';
import { HelpButton } from 'src/components/HelpButton/HelpButton';
import type { ToolName } from 'src/utils';
import type { ItemControls } from 'src/types';
import type { Size } from 'src/types/common';
import { Surface } from 'src/vendor/accurona-ui';

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
  // The zoom row's element, measured so the title bar keeps clear of it.
  bottomRowRef?: (el: HTMLDivElement | null) => void;
}

// Below this canvas width the zoom row drops its percentage readout.
const COMPACT_WIDTH = 480;

export const ToolbarSlots = ({
  availableTools,
  appPadding,
  spacing,
  rendererSize,
  itemControls,
  bottomRowRef
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
        <Surface
          sx={{
            position: 'absolute',
            // A visible scrollbar when the content is taller than the
            // panel: it was hidden, so the bottom of the inspector (the
            // Redacted layer caption, Delete) looked cut off with nothing
            // saying it scrolled (sweep 2026-09-30, A04/A13).
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}
          style={{
            left: appPadding.x,
            // 360px, narrowed on a phone so it stops a padding short of
            // the right edge; at 390px it ran 9px off (sweep 2026-09-30).
            width: rendererSize.width
              ? Math.min(360, rendererSize.width - appPadding.x * 2)
              : 360,
            top: appPadding.y * 2 + spacing(2),
            maxHeight: rendererSize.height - appPadding.y * 6
          }}
        >
          {/* BUG15-50: a press in the inspector is the panel's own, not
              the canvas's. The interaction manager records every press on
              the window as the pointer's press, so dragging the Label
              height slider looked like a drag from empty canvas: it began
              a marquee under the panel, which cleared the selection and
              closed the inspector. Stopping the press here keeps the
              marquee code as it is (a check there on where the press
              landed was reverted in b0ec40e). */}
          <Box
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            <ItemControlsManager />
          </Box>
        </Surface>
      )}

      {/* The help button shares the bottom-left row with the zoom
          controls. It used to be right-anchored inside the overlay's
          0x0 container, which put it at a negative x, off-screen; the
          bottom-right corner now belongs to the mini-map. */}
      {/* Only with the zoom controls: a view-only render (the export
          dialogs' copy of the diagram) has no chrome, and the button
          came out in the universal SVG. */}
      {availableTools.includes('ZOOM_CONTROLS') && (
        <Stack
          ref={bottomRowRef}
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            transformOrigin: 'bottom left'
          }}
          style={{
            top: rendererSize.height - appPadding.y * 2,
            left: appPadding.x
          }}
        >
          <ZoomControls
            compact={
              rendererSize.width > 0 && rendererSize.width < COMPACT_WIDTH
            }
          />
          <HelpButton />
        </Stack>
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
    </>
  );
};
