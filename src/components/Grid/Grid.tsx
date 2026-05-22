import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import gsap from 'gsap';
import { Size } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { SizeUtils } from 'src/utils/SizeUtils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';

// FEA7-04: build the grid-tile SVG as a data URL with the stroke
// colour and opacity threaded through from the active MUI theme.
// Pre-FEA7-04 this was a static `src/assets/grid-tile-bg.svg` import
// — fine for the light-only era, but the strokes there are dark and
// reading them on a dark canvas required either two SVG variants or
// an inline component. Generating the data URL at render time is
// cheaper than swapping <img> elements and keeps the existing
// background-image positioning pipeline (gsap-animated zoom + pan).
const buildGridTileDataUrl = (stroke: string, opacity: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141.38828 163.26061"><g stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1" stroke-alignment="center"><polygon points="70.69436 122.44546 .00022 81.63018 70.69392 40.81515 141.38806 81.63043 70.69436 122.44546" fill="none"/><line x1="70.69414" y1="40.81503" x2="141.38784"/><line y1="0" x2="70.69414" y2="40.81528"/><line x1="70.69414" y1="122.44559" x2=".00044" y2="163.26061"/><line x1="141.38828" y1="163.26061" x2="70.69414" y2="122.44533"/></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const Grid = () => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const { size } = useResizeObserver(element);
  const isFirstRenderRef = useRef(true);
  const scroll = useUiStateStore((state) => {
    return state.scroll;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const theme = useTheme();

  // Pick a stroke colour + opacity per palette mode. Dark mode needs
  // a brighter stroke with higher opacity so the iso-grid is still
  // perceivable on the darker canvas; light mode preserves the
  // pre-FEA7-04 look (black at 0.15 alpha) exactly.
  const gridBg = useMemo(() => {
    const isDark = theme.palette.mode === 'dark';
    return buildGridTileDataUrl(
      isDark ? '#ffffff' : '#000000',
      isDark ? 0.12 : 0.15
    );
  }, [theme.palette.mode]);

  useEffect(() => {
    if (!element) return;

    const tileSize = SizeUtils.multiply(PROJECTED_TILE_SIZE, zoom);
    const elSize = element.getBoundingClientRect();
    const backgroundPosition: Size = {
      width: elSize.width / 2 + scroll.position.x + tileSize.width / 2,
      height: elSize.height / 2 + scroll.position.y
    };

    gsap.to(element, {
      duration: isFirstRenderRef.current ? 0 : 0.25,
      backgroundSize: `${tileSize.width}px ${tileSize.height * 2}px`,
      backgroundPosition: `${backgroundPosition.width}px ${backgroundPosition.height}px`
    });

    isFirstRenderRef.current = false;
  }, [scroll, zoom, size, element]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <Box
        ref={setElement}
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `repeat url("${gridBg}")`
        }}
      />
    </Box>
  );
};
