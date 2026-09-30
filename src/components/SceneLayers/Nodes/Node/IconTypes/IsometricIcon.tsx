import { Box } from '@mui/material';
import { PROJECTED_TILE_SIZE } from 'src/config';

interface Props {
  url: string;
  onImageLoaded?: () => void;
}

export const IsometricIcon = ({ url, onImageLoaded }: Props) => {
  return (
    <Box
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
        // Stands on the node's point, bottom centre, whatever its size.
        // It used to be placed by its measured size, which a
        // ResizeObserver reported a frame or more after the image loaded:
        // an image export captured in between drew the icon a whole icon
        // height below its node (sweep 2026-09-30, A14/A18).
        top: 0,
        left: 0,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none'
      }}
    />
  );
};
