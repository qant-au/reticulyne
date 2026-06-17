import { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { PROJECTED_TILE_SIZE } from 'src/config';
import { useResizeObserver } from 'src/hooks/useResizeObserver';

interface Props {
  url: string;
  onImageLoaded?: () => void;
}

export const IsometricIcon = ({ url, onImageLoaded }: Props) => {
  const ref = useRef<HTMLImageElement | null>(null);
  const { size, observe, disconnect } = useResizeObserver();

  useEffect(() => {
    if (!ref.current) return;

    observe(ref.current);

    return disconnect;
  }, [observe, disconnect]);

  return (
    <Box
      ref={ref}
      component="img"
      loading="lazy"
      onLoad={onImageLoaded}
      src={url}
      sx={{
        position: 'absolute',
        width: PROJECTED_TILE_SIZE.width * 0.8,
        // Override any host-side CSS reset that sets
        // `img { max-width: 100%; height: auto }` (Tailwind preflight,
        // some global normalize sheets). The icon's wrapping Boxes
        // in Node.tsx are absolutely positioned with no intrinsic
        // size, so `max-width: 100%` clamps to 0 and the icon
        // collapses invisibly even though the SVG has decoded fine.
        maxWidth: 'none',
        maxHeight: 'none',
        height: 'auto',
        top: -size.height,
        left: -size.width / 2,
        pointerEvents: 'none'
      }}
    />
  );
};
