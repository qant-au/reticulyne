import { useMemo } from 'react';
import { getItemById } from 'src/utils';
import { useScene } from 'src/hooks/useScene';

export const useConnector = (id: string) => {
  const { connectors } = useScene();

  const connector = useMemo(() => {
    // A deleted connector's component goes through one final render cycle
    // before unmounting. Return null rather than throwing so the component
    // can bail out cleanly instead of hitting ReticulyneErrorBoundary.
    return getItemById(connectors, id);
  }, [connectors, id]);

  return connector;
};
