// Optional bottom-left debug panel; sits above ZoomControls.
// Visible when the consumer passes enableDebugTools=true (forwarded
// from the <Reticulyne enableDebugTools={...} /> prop and stored on the
// ui-state store).
//
// Extracted from UiOverlay.tsx under QUA4-10.

import { DebugUtils } from 'src/components/DebugUtils/DebugUtils';
import type { Size } from 'src/types/common';
import { Surface } from 'src/vendor/accurona-ui';
import { titleBarRaised } from './TitleBar';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  appPadding: AppPadding;
  spacing: (multiplier: number) => number;
  rendererSize: Size;
  bottomRowWidth?: number;
}

export const DebugPanel = ({
  visible,
  appPadding,
  spacing,
  rendererSize,
  bottomRowWidth = 0
}: Props) => {
  if (!visible) return null;

  // Above the title bar when that sits a row up (a phone), not over it;
  // and no taller than half the canvas, scrolling, so the diagram is not
  // buried under it.
  const raised = titleBarRaised(rendererSize.width, appPadding, bottomRowWidth);
  const bottom =
    rendererSize.height -
    appPadding.y * (raised ? 3 : 2) -
    (raised ? 8 : 0) -
    spacing(1);

  return (
    <Surface
      sx={{
        position: 'absolute',
        width: 350,
        transform: 'translateY(-100%)',
        overflowY: 'auto'
      }}
      style={{
        // Was `calc(390 - 80px)`, which is not valid CSS, so ignored.
        maxWidth: rendererSize.width - appPadding.x * 2,
        maxHeight: rendererSize.height / 2,
        left: appPadding.x,
        top: bottom
      }}
    >
      <DebugUtils />
    </Surface>
  );
};
