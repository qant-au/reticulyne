// Optional bottom-left debug panel; sits above ZoomControls.
// Visible when the consumer passes enableDebugTools=true (forwarded
// from the <Reticulyne enableDebugTools={...} /> prop and stored on the
// ui-state store).
//
// Extracted from UiOverlay.tsx under QUA4-10.

import { UiElement } from 'src/components/UiElement/UiElement';
import { DebugUtils } from 'src/components/DebugUtils/DebugUtils';
import type { Size } from 'src/types/common';

interface AppPadding {
  x: number;
  y: number;
}

interface Props {
  visible: boolean;
  appPadding: AppPadding;
  spacing: (multiplier: number) => number;
  rendererSize: Size;
}

export const DebugPanel = ({
  visible,
  appPadding,
  spacing,
  rendererSize
}: Props) => {
  if (!visible) return null;

  return (
    <UiElement
      sx={{
        position: 'absolute',
        width: 350,
        transform: 'translateY(-100%)'
      }}
      style={{
        maxWidth: `calc(${rendererSize.width} - ${appPadding.x * 2}px)`,
        left: appPadding.x,
        top: rendererSize.height - appPadding.y * 2 - spacing(1)
      }}
    >
      <DebugUtils />
    </UiElement>
  );
};
