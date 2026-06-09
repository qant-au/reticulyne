import { useMemo } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { DEFAULT_ICON } from 'src/config';

export const useIcon = (id: string | undefined) => {
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const icon = useMemo(() => {
    if (!id) return DEFAULT_ICON;

    // A ModelItem can outlive its referenced icon (e.g. the host swaps
    // palettes mid-session via the imperative loadModel API). Fall back
    // to DEFAULT_ICON rather than throwing — a throw here surfaces
    // through ReticulyneErrorBoundary and replaces the whole editor with
    // the failure UI for every node that references the missing icon.
    const found = icons.find((i) => {
      return i.id === id;
    });

    return found ?? DEFAULT_ICON;
  }, [icons, id]);

  const iconComponent = useMemo(() => {
    if (!icon.isIsometric) {
      return <NonIsometricIcon icon={icon} />;
    }

    return <IsometricIcon key={icon.url} url={icon.url} />;
  }, [icon]);

  return {
    icon,
    iconComponent
  };
};
