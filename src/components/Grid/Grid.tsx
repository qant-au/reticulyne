import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import gsap from 'gsap';
import { Size } from 'src/types';
import gridTileSvg from 'src/assets/grid-tile-bg.svg';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { SizeUtils } from 'src/utils/SizeUtils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';

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
          background: `repeat url("${gridTileSvg}")`
        }}
      />
    </Box>
  );
};
