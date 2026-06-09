import { memo, useMemo } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { useSceneConnectorsList } from 'src/hooks/sceneLists';
import { Connector } from './Connector';

export const Connectors = memo(() => {
  const connectors = useSceneConnectorsList();
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });

  const mode = useUiStateStore((state) => {
    return state.mode;
  });

  const activeHighlightId = useActiveHighlightId();

  const selectedConnectorId = useMemo(() => {
    if (mode.type === 'CONNECTOR') {
      return mode.id;
    }
    if (itemControls?.type === 'CONNECTOR') {
      return itemControls.id;
    }

    return null;
  }, [mode, itemControls]);

  const ordered = useMemo(() => {
    return [...connectors].reverse();
  }, [connectors]);

  return (
    <>
      {ordered.map((connector) => {
        return (
          <Connector
            key={connector.id}
            connector={connector}
            isSelected={selectedConnectorId === connector.id}
            isDimmed={
              activeHighlightId !== null && activeHighlightId !== connector.id
            }
          />
        );
      })}
    </>
  );
});

Connectors.displayName = 'Connectors';
