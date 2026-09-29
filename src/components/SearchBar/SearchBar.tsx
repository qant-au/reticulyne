import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, InputBase, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { searchNodes } from 'src/utils';

// Ctrl/Cmd+F opens this bar. Typing lists matching nodes
// (highlighted on the canvas by SearchHighlights); Enter goes to the next
// match, selecting it and centring the view on it, Shift+Enter to the
// previous; Esc closes. Any editor mode: finding a node changes nothing.
export const SearchBar = () => {
  const open = useUiStateStore((state) => {
    return state.searchOpen;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelItems = useModelStore((state) => {
    return state.items;
  });
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const { items: viewItems } = useScene();
  const { centerOnTile } = useDiagramUtils();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matches = useMemo(() => {
    const onView = new Set(
      viewItems.map((v) => {
        return v.id;
      })
    );
    const iconName = new Map(
      icons.map((i) => {
        return [i.id, i.name];
      })
    );
    return searchNodes(
      query,
      modelItems
        .filter((m) => {
          return onView.has(m.id);
        })
        .map((m) => {
          return {
            id: m.id,
            name: m.name,
            description: m.description,
            iconName: m.icon ? iconName.get(m.icon) : undefined
          };
        })
    );
  }, [query, modelItems, icons, viewItems]);

  useEffect(() => {
    uiStateActions.setSearchMatches(open ? matches : []);
  }, [open, matches, uiStateActions]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const close = () => {
    setQuery('');
    setIndex(-1);
    uiStateActions.setSearchOpen(false);
  };

  const go = (step: 1 | -1) => {
    if (matches.length === 0) return;
    const next = (index + step + matches.length) % matches.length;
    setIndex(next);
    const id = matches[next];
    const tile = viewItems.find((v) => {
      return v.id === id;
    })?.tile;
    uiStateActions.setSelection([{ type: 'ITEM', id }]);
    if (tile) centerOnTile(tile);
  };

  return (
    <Box
      role="search"
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        width: 360,
        maxWidth: 'calc(100% - 32px)',
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 3,
        zIndex: 20
      }}
    >
      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      <InputBase
        inputRef={inputRef}
        value={query}
        placeholder="Find items"
        inputProps={{ 'aria-label': 'Find items' }}
        sx={{ flex: 1 }}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            go(e.shiftKey ? -1 : 1);
          }
        }}
      />
      <Typography
        variant="caption"
        data-testid="search-count"
        sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {query.trim()
          ? matches.length === 0
            ? 'No matches'
            : `${index < 0 ? 0 : index + 1} / ${matches.length}`
          : ''}
      </Typography>
    </Box>
  );
};
