import { Box } from '@mui/material';
import { SCHEMATIC_TILE_SIZE } from 'src/config';

interface Props {
  url: string;
}

// A node in the flat, schematic view: its 2D symbol drawn flat,
// centred on the tile and fitted inside it.
export const SchematicIcon = ({ url }: Props) => {
  const size = SCHEMATIC_TILE_SIZE.width * 0.8;

  return (
    <Box
      component="img"
      loading="lazy"
      src={url}
      data-testid="schematic-icon"
      // maxWidth/maxHeight overrides are defensive against host-side CSS
      // resets (e.g. Tailwind preflight) that clamp images to their
      // containing block; see IsometricIcon.tsx.
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        maxWidth: 'none',
        maxHeight: 'none',
        objectFit: 'contain',
        left: -size / 2,
        top: -size / 2,
        pointerEvents: 'none'
      }}
    />
  );
};
