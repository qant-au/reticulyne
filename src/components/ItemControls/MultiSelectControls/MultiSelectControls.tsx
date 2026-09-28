import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { ItemReference } from 'src/types';
import { connectorsFirst } from 'src/utils';
import { ControlsContainer } from '../components/ControlsContainer';
import { Header } from '../components/Header';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';
import { LayerOrderSection } from '../components/LayerOrderSection';
import { ArrangeSection } from '../components/ArrangeSection';
import { GroupSection } from '../components/GroupSection';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';

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
    setColour
  } = useScene();

  const summary = useMemo(() => {
    return summarise(selection);
  }, [selection]);

  // 1.3: rectangles, connectors and text boxes each order within their own
  // layer and move as one block. Nodes are depth-sorted (z-index -x - y),
  // so they have no layer order to change and are left out.
  const orderable = useMemo(() => {
    return selection.filter((item) => {
      return (
        item.type === 'RECTANGLE' ||
        item.type === 'CONNECTOR' ||
        item.type === 'TEXTBOX'
      );
    });
  }, [selection]);

  // Worklist 19: only connectors and rectangles carry a colour.
  const colourable = useMemo(() => {
    return selection.filter((item) => {
      return item.type === 'CONNECTOR' || item.type === 'RECTANGLE';
    });
  }, [selection]);

  const hasNodes = selection.some((item) => {
    return item.type === 'ITEM';
  });

  const deleteAll = () => {
    // Clear the selection first: every delete below rewrites the scene, and
    // leaving references to now-deleted ids in the store makes the outline
    // renderers look them up and throw.
    uiStateActions.clearSelection();

    connectorsFirst(selection).forEach((item) => {
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
      {colourable.length > 0 && (
        <Section title="Colour">
          <ColorSelector
            onChange={(color) => {
              setColour(colourable, color);
            }}
          />
          {colourable.length < selection.length && (
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: 'block', pt: 1 }}
            >
              Applies to connectors and rectangles; nodes and text boxes have no
              colour.
            </Typography>
          )}
        </Section>
      )}
      <GroupSection selection={selection} />
      <ArrangeSection selection={selection} />
      <LayerOrderSection
        targets={orderable}
        note={
          hasNodes
            ? 'Nodes keep their depth order and are not moved.'
            : undefined
        }
      />
      <Section>
        <Box>
          <DeleteButton onClick={deleteAll} />
        </Box>
      </Section>
    </ControlsContainer>
  );
};
