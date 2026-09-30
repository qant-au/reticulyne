import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { placedOnlyElsewhere } from 'src/vendor/accurona-core';
import { PanelSection } from 'src/vendor/accurona-ui';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { availableIcon, objectName } from 'src/scene/crossover';
import { DEFAULT_ICON } from 'src/config';
import type { Icon } from 'src/types';
import { IconGrid } from './IconGrid';

/** What arming a floor-plan object needs: its id, name and icon, if any. */
export interface FloorPlanObject {
  id: string;
  name: string;
  icon?: string;
}

// lw-055: devices placed on the floor plan (in Axonometra) that no diagram
// view has yet. Placing one keeps its object id, so the node in the diagram
// and the device on the plan are the same object.
export const FloorPlanObjects = ({
  onMouseDown
}: {
  onMouseDown: (object: FloorPlanObject) => void;
}) => {
  const opened = useUiStateStore((state) => {
    return state.sceneContext.opened;
  });
  const items = useModelStore((state) => {
    return state.items;
  });
  const icons = useModelStore((state) => {
    return state.icons;
  });

  const entries = useMemo(() => {
    const inDiagram = new Set(
      items.map((item) => {
        return item.id;
      })
    );
    const urls = new Map(
      icons.map((icon) => {
        return [icon.id, icon.url];
      })
    );
    return placedOnlyElsewhere(opened, ['iso', 'schematic'])
      .filter((object) => {
        return !inDiagram.has(object.id);
      })
      .map((object) => {
        const icon = availableIcon(object, icons);
        return {
          object: { id: object.id, name: objectName(object), icon },
          tile: {
            id: object.id,
            name: objectName(object),
            url: (icon && urls.get(icon)) ?? DEFAULT_ICON.url,
            isIsometric: true
          } satisfies Icon
        };
      });
  }, [opened, items, icons]);

  if (!entries.length) return null;

  return (
    <PanelSection title="On the floor plan">
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Placed on the floor plan, not in any diagram yet. Placing one links it
        to the device on the plan.
      </Typography>
      <div data-testid="floor-plan-objects">
        <IconGrid
          icons={entries.map((entry) => {
            return entry.tile;
          })}
          onMouseDown={(tile) => {
            const entry = entries.find((e) => {
              return e.object.id === tile.id;
            });
            if (entry) onMouseDown(entry.object);
          }}
        />
      </div>
    </PanelSection>
  );
};
