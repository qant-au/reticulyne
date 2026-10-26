import { useMemo } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { SchematicIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/SchematicIcon';
import { DEFAULT_ICON } from 'src/config';
import type { Projection } from 'src/types';
import type { IconOverride } from 'src/core';

export const useIcon = (
  id: string | undefined,
  projection: Projection = 'iso',
  override?: IconOverride
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
    // An item's own override comes first, view by view: its flat image in
    // the flat view, its isometric drawing in the iso view. Neither changes
    // the icon, so the other view keeps the icon's own drawing.
    if (projection === 'schematic' && override?.flatUrl) {
      return <SchematicIcon key={override.flatUrl} url={override.flatUrl} />;
    }
    if (projection === 'iso' && override?.url) {
      return <IsometricIcon key={override.url} url={override.url} />;
    }

    // The flat view draws every node as a 2D symbol: the icon's flat
    // drawing, else its main image.
    const url =
      projection === 'schematic' ? (icon.flatUrl ?? icon.url) : icon.url;

    // No drawing at all (an item with no icon): draw nothing rather than
    // an <img src="">, which resolves to the page itself - a broken image
    // that also broke every PDF and image capture of the canvas.
    if (!url) return null;

    if (projection === 'schematic') {
      return <SchematicIcon key={url} url={url} />;
    }

    if (!icon.isIsometric) {
      return <NonIsometricIcon icon={icon} />;
    }

    return <IsometricIcon key={icon.url} url={icon.url} />;
  }, [icon, projection, override]);

  return {
    icon,
    iconComponent
  };
};
