import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { connectorPathTileToGlobal, getTilePosition } from 'src/utils';
import type { ConnectorIndicatorComponent } from 'src/types/isoflowProps';
import type { Connector as ConnectorModel, View } from 'src/types';

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
  view: View;
  Indicator: ConnectorIndicatorComponent;
}

// FEA7-03: position the indicator at the connector's midpoint using
// the same math ConnectorLabel does (floor-divide path tiles by two,
// project back to world via connectorPathTileToGlobal, then to
// screen via getTilePosition). The slot is absolutely positioned but
// pointer-events stay default so embedder content remains clickable.
export const ConnectorIndicator = ({ connector, view, Indicator }: Props) => {
  const midpoint = useMemo(() => {
    const tileIndex = Math.floor(connector.path.tiles.length / 2);
    const tile = connector.path.tiles[tileIndex];

    return getTilePosition({
      tile: connectorPathTileToGlobal(tile, connector.path.rectangle.from)
    });
  }, [connector.path]);

  // Strip the runtime `path` decoration before handing the connector
  // to the embedder — they see the schema-level shape only, matching
  // how nodeIndicatorComponent receives a plain ModelItem.
  const connectorModel = useMemo<ConnectorModel>(() => {
    const rest: Record<string, unknown> = { ...connector };
    delete rest.path;
    return rest as unknown as ConnectorModel;
  }, [connector]);

  return (
    <Box
      data-testid="connector-indicator-slot"
      sx={{ position: 'absolute' }}
      style={{ left: midpoint.x, top: midpoint.y }}
    >
      {Indicator({ connector: connectorModel, view })}
    </Box>
  );
};
