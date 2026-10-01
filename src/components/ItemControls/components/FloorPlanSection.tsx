import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { objectPlaces } from 'src/vendor/accurona-core';
import { PanelSection } from 'src/vendor/accurona-ui';
import { useUiStateStore } from 'src/stores/uiStateStore';

/** A plan position in metres, as a person reads it off a drawing. */
const metres = (mm: number | undefined) => {
  return mm === undefined ? '' : `${(mm / 1000).toFixed(1)} m`;
};

// Where this node is on the building. A node and a device on the
// floor plan are one scene object; this reads the plan placements of the
// scene the diagram was opened from. Nothing shows for a node on no plan.
export const FloorPlanSection = ({ itemId }: { itemId: string }) => {
  const opened = useUiStateStore((state) => {
    return state.sceneContext.opened;
  });
  const places = useMemo(() => {
    return objectPlaces(opened, itemId).filter((place) => {
      return place.kind === 'plan';
    });
  }, [opened, itemId]);

  if (!places.length) return null;

  return (
    <PanelSection title="On the floor plan">
      <Stack spacing={0.5} data-testid="floor-plan-location">
        {places.map((place) => {
          return (
            <Typography key={place.viewId} variant="body2">
              {place.floorName ?? place.floorId} · {place.viewName}
              {/* inherit, not body2: body2 is 0.75em, so nesting it shrank
                  the position to three quarters of the line it sits in. */}
              <Typography
                component="span"
                variant="inherit"
                sx={{ color: 'text.secondary' }}
              >
                {' '}
                ({metres(place.x)}, {metres(place.y)})
              </Typography>
            </Typography>
          );
        })}
      </Stack>
    </PanelSection>
  );
};
