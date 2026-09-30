import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { PanelSection } from 'src/vendor/accurona-ui';
import { useModelStore } from 'src/stores/modelStore';
import { ITEMS } from 'src/catalogue/items';
import { catalogueItemSymbol, itemToSceneObject } from 'src/catalogue/place';
import { FAMILIES, FAMILY_NAMES } from 'src/catalogue/schema';
import type { CatalogueItem } from 'src/catalogue/schema';
import { availableIcon } from 'src/scene/crossover';
import { DEFAULT_ICON } from 'src/config';
import type { Icon } from 'src/types';
import { IconCollection } from './IconCollection';
import { IconGrid } from './IconGrid';

interface Props {
  /** The search box's text; search covers every item whatever its section. */
  filter: string;
  onMouseDown: (item: CatalogueItem) => void;
  onClick: (item: CatalogueItem) => void;
}

const TILE_PREFIX = 'catalogue:';

const matches = (item: CatalogueItem, needle: string) => {
  return [item.name, item.id, item.description ?? ''].some((text) => {
    return text.toLowerCase().includes(needle);
  });
};

// lw-082: Reticulyne's catalogue as palette sections, one per medium family
// (docs/catalogue.md "The palette"). A tile shows the item's Accurona twin
// when the editor has that drawing, else its 2D schematic symbol.
export const CatalogueItems = ({ filter, onMouseDown, onClick }: Props) => {
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const tiles = useMemo(() => {
    const urls = new Map(
      icons.map((icon) => {
        return [icon.id, icon.url];
      })
    );
    return ITEMS.map((item) => {
      const icon = availableIcon(itemToSceneObject(item, item.id), icons);
      const symbol = catalogueItemSymbol(item);
      const url =
        (icon && urls.get(icon)) ??
        (symbol
          ? `data:image/svg+xml,${encodeURIComponent(symbol)}`
          : DEFAULT_ICON.url);
      return {
        item,
        tile: {
          id: `${TILE_PREFIX}${item.id}`,
          name: item.name,
          url,
          isIsometric: icon !== undefined
        } satisfies Icon
      };
    });
  }, [icons]);

  const byTile = useMemo(() => {
    return new Map(
      tiles.map((t) => {
        return [t.tile.id, t.item];
      })
    );
  }, [tiles]);

  const handlers = {
    onMouseDown: (tile: Icon) => {
      const item = byTile.get(tile.id);
      if (item) onMouseDown(item);
    },
    onClick: (tile: Icon) => {
      const item = byTile.get(tile.id);
      if (item) onClick(item);
    }
  };

  if (filter) {
    const needle = filter.toLowerCase();
    const found = tiles.filter((t) => {
      return matches(t.item, needle);
    });
    if (!found.length) return null;
    return (
      <PanelSection title="Catalogue">
        <div data-testid="catalogue-items">
          <IconGrid
            icons={found.map((t) => {
              return t.tile;
            })}
            {...handlers}
          />
        </div>
      </PanelSection>
    );
  }

  return (
    <div data-testid="catalogue-items">
      <PanelSection title="Catalogue" sx={{ pb: 0 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Devices with their ports, by medium. A placed device keeps its ports
          and its link to the catalogue.
        </Typography>
      </PanelSection>
      {FAMILIES.map((family) => {
        const inFamily = tiles.filter((t) => {
          return t.item.family === family;
        });
        if (!inFamily.length) return null;
        return (
          <IconCollection
            key={family}
            id={FAMILY_NAMES[family]}
            icons={inFamily.map((t) => {
              return t.tile;
            })}
            isExpanded={false}
            {...handlers}
          />
        );
      })}
    </div>
  );
};
