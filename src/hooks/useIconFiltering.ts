import { useState, useMemo } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { Icon } from 'src/types';

export const useIconFiltering = () => {
  const [filter, setFilter] = useState<string>('');

  const icons = useModelStore((state) => {
    return state.icons;
  });

  const filteredIcons = useMemo(() => {
    if (filter === '') return null;

    const needle = filter.toLowerCase();

    return icons.filter((icon: Icon) => {
      return icon.name.toLowerCase().includes(needle);
    });
  }, [icons, filter]);

  return {
    setFilter,
    filter,
    filteredIcons
  };
};
