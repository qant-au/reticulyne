import { useTheme } from '@mui/material';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';

// while search is open, a faint outline marks the tile of
// every matching node, so the whole result set is visible at once.
export const SearchHighlights = () => {
  const theme = useTheme();
  const matches = useUiStateStore((state) => {
    return state.searchMatches;
  });
  const { items } = useScene();
  if (matches.length === 0) return null;
  const wanted = new Set(matches);

  return (
    <>
      {items
        .filter((i) => {
          return wanted.has(i.id);
        })
        .map((i) => {
          return (
            <IsoTileArea
              key={i.id}
              from={i.tile}
              to={i.tile}
              cornerRadius={16}
              stroke={{ width: 4, color: theme.palette.warning.main }}
            />
          );
        })}
    </>
  );
};
