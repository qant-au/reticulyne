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

  const selection = useUiStateStore((state) => {
    return state.selection;
  });

  const activeHighlightId = useActiveHighlightId();

  // In a multi-selection every selected connector shows its anchors, as
  // one does on its own; before, only the single-select case did, and a
  // connector in a marquee looked unselected.
  const selectedInMulti = useMemo(() => {
    return new Set(
      selection.length > 1
        ? selection
            .filter((s) => {
              return s.type === 'CONNECTOR';
            })
            .map((s) => {
              return s.id;
            })
        : []
    );
  }, [selection]);

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
            isSelected={
              selectedConnectorId === connector.id ||
              selectedInMulti.has(connector.id)
            }
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
