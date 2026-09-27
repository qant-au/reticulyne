import { useMemo } from 'react';
import chroma from 'chroma-js';
import { useTheme } from '@mui/material';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { useUiStateStore } from 'src/stores/uiStateStore';

export const Cursor = () => {
  const theme = useTheme();
  const tile = useUiStateStore((state) => {
    return state.mouse.position.tile;
  });
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  // PRF-09: the cursor re-renders on every tile the mouse crosses; the
  // fill only changes with the theme.
  const fill = useMemo(() => {
    return chroma(theme.palette.primary.main).alpha(0.5).css();
  }, [theme.palette.primary.main]);

  return (
    <IsoTileArea from={tile} to={tile} fill={fill} cornerRadius={10 * zoom} />
  );
};
