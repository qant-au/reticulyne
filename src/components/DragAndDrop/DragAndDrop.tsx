import { useMemo } from 'react';
import { Box } from '@mui/material';
import { Coords } from 'src/types';
import { getTilePosition } from 'src/utils';
import { useIcon } from 'src/hooks/useIcon';
import { useProjection } from 'src/hooks/useProjection';

interface Props {
  iconId: string;
  tile: Coords;
}

export const DragAndDrop = ({ iconId, tile }: Props) => {
  const projection = useProjection();
  const { iconComponent } = useIcon(iconId, projection);

  // An isometric icon stands on its tile's bottom vertex; a flat symbol
  // is centred on the tile.
  const tilePosition = useMemo(() => {
    return getTilePosition({
      tile,
      origin: projection === 'schematic' ? 'CENTER' : 'BOTTOM',
      projection
    });
  }, [tile, projection]);

  return (
    <Box
      sx={{
        position: 'absolute'
      }}
      style={{ left: tilePosition.x, top: tilePosition.y }}
    >
      {iconComponent}
    </Box>
  );
};
