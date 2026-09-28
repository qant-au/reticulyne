import { useEffect, useState } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';

// Whether the pointer is over the canvas itself. The mouse state starts
// at tile 0,0 and keeps updating while the pointer crosses the toolbar
// and panels, so pointer-driven hints (the hover tile, node ports, the
// tooltip) keyed on it alone showed on load, on whatever sat at the
// origin, and through the panels.
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
    rendererEl.addEventListener('pointerover', enter);
    rendererEl.addEventListener('pointerleave', leave);
    return () => {
      rendererEl.removeEventListener('pointerover', enter);
      rendererEl.removeEventListener('pointerleave', leave);
    };
  }, [rendererEl]);

  return overCanvas;
};
