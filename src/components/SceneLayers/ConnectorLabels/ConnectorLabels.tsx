import { memo, useMemo } from 'react';
import { useSceneConnectorsList } from 'src/hooks/sceneLists';
import { ConnectorLabel } from './ConnectorLabel';

export const ConnectorLabels = memo(() => {
  const connectors = useSceneConnectorsList();
  const labelled = useMemo(() => {
    return connectors.filter((connector) => {
      return Boolean(connector.description);
    });
  }, [connectors]);

  return (
    <>
      {labelled.map((connector) => {
        return <ConnectorLabel key={connector.id} connector={connector} />;
      })}
    </>
  );
});

ConnectorLabels.displayName = 'ConnectorLabels';
