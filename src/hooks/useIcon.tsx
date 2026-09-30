import { useMemo } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { SchematicIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/SchematicIcon';
import { DEFAULT_ICON } from 'src/config';
import { schematicIconUrl } from 'src/catalogue/place';
import type { Projection } from 'src/types';

export const useIcon = (
  id: string | undefined,
  projection: Projection = 'iso'
) => {
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
    // The flat view draws every node as a 2D symbol (lw-050).
    if (projection === 'schematic') {
      const url = schematicIconUrl(icon);
      return <SchematicIcon key={url} url={url} />;
    }

    // No drawing at all (an item with no icon): draw nothing rather than
    // an <img src="">, which resolves to the page itself - a broken image
    // that also broke every PDF and image capture of the canvas.
    if (!icon.url) return null;

    if (!icon.isIsometric) {
      return <NonIsometricIcon icon={icon} />;
    }

    return <IsometricIcon key={icon.url} url={icon.url} />;
  }, [icon, projection]);

  return {
    icon,
    iconComponent
  };
};
