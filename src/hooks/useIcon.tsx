import { useMemo } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { getItemByIdOrThrow } from 'src/utils';
import { IsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon';
import { NonIsometricIcon } from 'src/components/SceneLayers/Nodes/Node/IconTypes/NonIsometricIcon';
import { DEFAULT_ICON } from 'src/config';

export const useIcon = (id: string | undefined) => {
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const icon = useMemo(() => {
    if (!id) return DEFAULT_ICON;

    return getItemByIdOrThrow(icons, id).value;
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
