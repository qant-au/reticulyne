import { memo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useSceneConnectorsList } from 'src/hooks/sceneLists';
import { ConnectorIndicator } from './ConnectorIndicator';

// FEA7-03: parallel to ConnectorLabels — renders the host-supplied
// `connectorIndicatorComponent` at each connector's midpoint. Mounted
// as its own SceneLayer so indicators sit on top of connector lines
// but below the interaction layer, matching how labels are layered.
export const ConnectorIndicators = memo(() => {
  const connectors = useSceneConnectorsList();
  const Indicator = useUiStateStore((state) => {
    return state.connectorIndicatorComponent;
  });
  const { currentView } = useScene();

  if (!Indicator) return null;

  return (
    <>
      {connectors.map((connector) => {
        return (
          <ConnectorIndicator
            key={connector.id}
            connector={connector}
            view={currentView}
            Indicator={Indicator}
          />
        );
      })}
    </>
  );
});

ConnectorIndicators.displayName = 'ConnectorIndicators';
