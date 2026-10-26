import { useMemo } from 'react';
import { packContents } from 'src/icons/packRegistry';
import { useUiStateStore } from 'src/stores/uiStateStore';

/**
 * What the loaded icon packs add to the catalogue: their devices with ports
 * (palette items) and the media: the built-in media plus every pack's own.
 */
export const usePackCatalogue = () => {
  const packs = useUiStateStore((state) => {
    return state.packs;
  });
  return useMemo(() => {
    const { items, media } = packContents(packs);
    return { items, media };
  }, [packs]);
};
