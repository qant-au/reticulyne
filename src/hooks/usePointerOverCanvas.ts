import { useEffect, useState } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';

// Whether the pointer is over the canvas itself. The mouse state starts
// at tile 0,0 and keeps updating while the pointer crosses the toolbar
// and panels, so pointer-driven hints (the hover tile, node ports, the
// tooltip) keyed on it alone showed on load, on whatever sat at the
// origin, and through the panels.
//
// It counts once the pointer MOVES over the canvas, not on pointerover: a
// canvas that appears under a still pointer (the examples rail closing on
// a phone) gets a pointerover with no move, and the mouse state still at
// 0,0 showed the tooltip of the node at the origin in the top-left corner.
export const usePointerOverCanvas = () => {
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const [overCanvas, setOverCanvas] = useState(false);

  useEffect(() => {
    if (!rendererEl) return undefined;
    const enter = () => {
      setOverCanvas(true);
    };
    const leave = () => {
      setOverCanvas(false);
    };
    rendererEl.addEventListener('pointermove', enter);
    rendererEl.addEventListener('pointerleave', leave);
    return () => {
      rendererEl.removeEventListener('pointermove', enter);
      rendererEl.removeEventListener('pointerleave', leave);
    };
  }, [rendererEl]);

  return overCanvas;
};
