// PRF-03 / PRF-04: narrow read-hooks for the four SceneLayer parents
// (Connectors, Rectangles, TextBoxes, Nodes). Each parent calls its own
// hook directly — replacing the prop-drilled lists from useScene() —
// and per-id merged objects keep their identity when their inputs are
// unchanged, so React.memo on the parents and on child Connector /
// Rectangle / TextBox / Node components has something to bite on.
import { useMemo, useState } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  CONNECTOR_DEFAULTS,
  RECTANGLE_DEFAULTS,
  TEXTBOX_DEFAULTS
} from 'src/config';
import { getItemByIdOrThrow } from 'src/utils';
import type { useScene } from 'src/hooks/useScene';
import type { ViewItem } from 'src/types';

type CacheEntry<T> = { keys: readonly unknown[]; value: T };

const shallowKeysEqual = (
  a: readonly unknown[],
  b: readonly unknown[]
): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const useStableMergedList = <S extends { id: string }, T>(
  sources: readonly S[] | undefined,
  keysFor: (src: S) => readonly unknown[],
  build: (src: S) => T
): T[] => {
  // useState's lazy initialiser gives a stable Map across renders
  // without the `react-hooks/refs` lint that fires on useRef mutation
  // in render bodies. The cache itself isn't reactive state — its
  // contents only feed memo decisions for the returned list — so the
  // setter is never used.
  const [cache] = useState(() => {
    return new Map<string, CacheEntry<T>>();
  });
  return useMemo(() => {
    const list: T[] = [];
    const seen = new Set<string>();
    if (sources) {
      for (let i = 0; i < sources.length; i += 1) {
        const src = sources[i];
        const id = src.id;
        seen.add(id);
        const keys = keysFor(src);
        const cached = cache.get(id);
        if (cached && shallowKeysEqual(cached.keys, keys)) {
          list.push(cached.value);
        } else {
          const value = build(src);
          cache.set(id, { keys, value });
          list.push(value);
        }
      }
    }
    Array.from(cache.keys()).forEach((id) => {
      if (!seen.has(id)) cache.delete(id);
    });
    return list;
  }, [sources, keysFor, build, cache]);
};

const useCurrentView = () => {
  const views = useModelStore((state) => {
    return state.views;
  });
  const currentViewId = useUiStateStore((state) => {
    return state.view;
  });
  return useMemo(() => {
    return getItemByIdOrThrow(views, currentViewId).value;
  }, [views, currentViewId]);
};

export const useSceneConnectorsList = (): ReturnType<
  typeof useScene
>['connectors'] => {
  const currentView = useCurrentView();
  const sceneConnectors = useSceneStore((state) => {
    return state.connectors;
  });
  const sources = currentView.connectors;
  const keysFor = useMemo(() => {
    return (c: NonNullable<typeof sources>[number]) => {
      return [c, sceneConnectors[c.id]] as const;
    };
  }, [sceneConnectors]);
  const build = useMemo(() => {
    return (c: NonNullable<typeof sources>[number]) => {
      return {
        ...CONNECTOR_DEFAULTS,
        ...c,
        ...sceneConnectors[c.id]
      };
    };
  }, [sceneConnectors]);
  return useStableMergedList(sources, keysFor, build);
};

export const useSceneRectanglesList = (): ReturnType<
  typeof useScene
>['rectangles'] => {
  const currentView = useCurrentView();
  const sources = currentView.rectangles;
  const keysFor = useMemo(() => {
    return (r: NonNullable<typeof sources>[number]) => {
      return [r] as const;
    };
  }, []);
  const build = useMemo(() => {
    return (r: NonNullable<typeof sources>[number]) => {
      return { ...RECTANGLE_DEFAULTS, ...r };
    };
  }, []);
  return useStableMergedList(sources, keysFor, build);
};

export const useSceneTextBoxesList = (): ReturnType<
  typeof useScene
>['textBoxes'] => {
  const currentView = useCurrentView();
  const sceneTextBoxes = useSceneStore((state) => {
    return state.textBoxes;
  });
  const sources = currentView.textBoxes;
  const keysFor = useMemo(() => {
    return (t: NonNullable<typeof sources>[number]) => {
      return [t, sceneTextBoxes[t.id]] as const;
    };
  }, [sceneTextBoxes]);
  const build = useMemo(() => {
    return (t: NonNullable<typeof sources>[number]) => {
      return {
        ...TEXTBOX_DEFAULTS,
        ...t,
        ...sceneTextBoxes[t.id]
      };
    };
  }, [sceneTextBoxes]);
  return useStableMergedList(sources, keysFor, build);
};

export const useSceneItemsList = (): ViewItem[] => {
  const currentView = useCurrentView();
  return useMemo(() => {
    return currentView.items ?? [];
  }, [currentView.items]);
};
