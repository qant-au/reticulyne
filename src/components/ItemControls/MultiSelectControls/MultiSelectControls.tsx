import { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import FlipToFrontIcon from '@mui/icons-material/FlipToFront';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ItemReference } from 'src/types';
import { ControlsContainer } from '../components/ControlsContainer';
import { Header } from '../components/Header';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

const TYPE_LABELS: Record<ItemReference['type'], [string, string]> = {
  ITEM: ['node', 'nodes'],
  CONNECTOR: ['connector', 'connectors'],
  CONNECTOR_ANCHOR: ['anchor', 'anchors'],
  TEXTBOX: ['text box', 'text boxes'],
  RECTANGLE: ['rectangle', 'rectangles']
};

const summarise = (selection: ItemReference[]) => {
  const counts = selection.reduce<
    Partial<Record<ItemReference['type'], number>>
  >((acc, item) => {
    return { ...acc, [item.type]: (acc[item.type] ?? 0) + 1 };
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => {
      const [singular, plural] = TYPE_LABELS[type as ItemReference['type']];
      return `${count} ${count === 1 ? singular : plural}`;
    })
    .join(', ');
};

// 1.4: the panel shown when more than one item is selected.
//
// Deliberately narrow. It offers only operations that mean the same thing
// for every member of a mixed selection — delete and layer order. Colour,
// size and label are per-type and would either need a type-partitioned form
// or would silently no-op on the members that don't have that field, both
// of which are worse than not offering them.
export const MultiSelectControls = () => {
  const selection = useUiStateStore((state) => {
    return state.selection;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const {
    deleteViewItem,
    deleteTextBox,
    deleteRectangle,
    deleteConnector,
    changeLayerOrder
  } = useScene();

  const summary = useMemo(() => {
    return summarise(selection);
  }, [selection]);

  // Layer ordering is rectangle-only today: the reducer throws
  // `Invalid item type` for anything else (see
  // src/stores/reducers/layerOrdering.ts, and ROADMAP 1.3, which is the item
  // that would widen it). So the section renders only when the selection
  // contains a rectangle, and acts on exactly the rectangles — offering
  // buttons that crash on a mixed selection is not an option, and silently
  // doing nothing for the other members is not much better.
  const rectangles = useMemo(() => {
    return selection.filter((item) => {
      return item.type === 'RECTANGLE';
    });
  }, [selection]);

  const isMixed = rectangles.length > 0 && rectangles.length < selection.length;

  const deleteAll = () => {
    // Clear the selection first: every delete below rewrites the scene, and
    // leaving references to now-deleted ids in the store makes the outline
    // renderers look them up and throw.
    uiStateActions.clearSelection();

    selection.forEach((item) => {
      switch (item.type) {
        case 'ITEM':
          deleteViewItem(item.id);
          break;
        case 'TEXTBOX':
          deleteTextBox(item.id);
          break;
        case 'RECTANGLE':
          deleteRectangle(item.id);
          break;
        case 'CONNECTOR':
          deleteConnector(item.id);
          break;
        default:
          break;
      }
    });
  };

  return (
    <ControlsContainer
      header={<Header title={`${selection.length} selected`} />}
    >
      <Section>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {summary}
        </Typography>
      </Section>
      {rectangles.length > 0 && (
        <Section title="Layer order">
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FlipToFrontIcon />}
              onClick={() => {
                rectangles.forEach((item) => {
                  changeLayerOrder('BRING_TO_FRONT', item);
                });
              }}
            >
              Front
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FlipToBackIcon />}
              onClick={() => {
                rectangles.forEach((item) => {
                  changeLayerOrder('SEND_TO_BACK', item);
                });
              }}
            >
              Back
            </Button>
          </Stack>
          {isMixed && (
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: 'block', pt: 1 }}
            >
              Applies to the{' '}
              {rectangles.length === 1
                ? '1 rectangle'
                : `${rectangles.length} rectangles`}{' '}
              only.
            </Typography>
          )}
        </Section>
      )}
      <Section>
        <Box>
          <DeleteButton onClick={deleteAll} />
        </Box>
      </Section>
    </ControlsContainer>
  );
};
