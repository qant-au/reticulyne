import { useEffect, useMemo, useRef } from 'react';
import { packContents } from 'src/icons/packRegistry';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { Icon } from 'src/types';
import { filterIconsByCollection } from 'src/utils/common';

// Keeps the icon library in step with the loaded icon packs: a pack's icons
// are added (replacing any icon of the same id, a diagram's saved copy
// included, so a pack's newer drawings show), and a removed pack's icons
// go, except one an object still draws with. Runs again after every load,
// which rebuilds the library. The icon categories follow, so a pack's
// collection is a section of the library.

const sameIcons = (a: Icon[], b: Icon[]) => {
  return (
    a.length === b.length &&
    a.every((icon, i) => {
      return icon === b[i];
    })
  );
};

export const useIconPackSync = (iconCollections?: {
  allow?: string[];
  deny?: string[];
}) => {
  const packs = useUiStateStore((state) => {
    return state.packs;
  });
  const loadGeneration = useUiStateStore((state) => {
    return state.loadGeneration;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const collectionsKey = JSON.stringify(iconCollections ?? null);
  const packIcons = useMemo(() => {
    return filterIconsByCollection(
      packContents(packs).icons,
      JSON.parse(collectionsKey) ?? undefined
    );
  }, [packs, collectionsKey]);
  // The pack icons last added, so a pack's removal takes them away.
  const added = useRef<Set<string>>(new Set());

  useEffect(() => {
    const model = modelActions.get();
    const ids = new Set(
      packIcons.map((icon) => {
        return icon.id;
      })
    );
    const used = new Set(
      model.items.map((item) => {
        return item.icon;
      })
    );
    const kept = model.icons.filter((icon) => {
      if (ids.has(icon.id)) return false;
      return !added.current.has(icon.id) || used.has(icon.id);
    });
    const icons = [...kept, ...packIcons];
    added.current = ids;
    if (!sameIcons(icons, model.icons)) modelActions.set({ icons });

    const categories = uiStateActions.get().iconCategoriesState;
    const present = new Set(
      icons.map((icon) => {
        return icon.collection;
      })
    );
    const still = categories.filter((c) => {
      return present.has(c.id);
    });
    const known = new Set(
      still.map((c) => {
        return c.id;
      })
    );
    const fresh = [...present]
      .filter((id): id is string => {
        return id !== undefined && !known.has(id);
      })
      .map((id) => {
        return { id, isExpanded: false };
      });
    if (fresh.length || still.length !== categories.length) {
      uiStateActions.setIconCategoriesState([...still, ...fresh]);
    }
  }, [packIcons, loadGeneration, modelActions, uiStateActions]);
};
