import { Slider, Box, TextField } from '@mui/material';
import { ModelItem, ViewItem } from 'src/types';
import { NAME_MAX } from 'src/schemas/common';
import { MarkdownEditor } from 'src/components/MarkdownEditor/MarkdownEditorLazy';
import { useModelItem } from 'src/hooks/useModelItem';
import { DeleteButton } from '../../components/DeleteButton';
import { LayerSection } from '../../components/LayerSection';
import { PanelSection } from 'src/vendor/accurona-ui';

export type NodeUpdates = {
  model: Partial<ModelItem>;
  view: Partial<ViewItem>;
};

interface Props {
  node: ViewItem;
  onModelItemUpdated: (updates: Partial<ModelItem>) => void;
  onViewItemUpdated: (updates: Partial<ViewItem>) => void;
  onDeleted: () => void;
}

export const NodeSettings = ({
  node,
  onModelItemUpdated,
  onViewItemUpdated,
  onDeleted
}: Props) => {
  const modelItem = useModelItem(node.id);
  if (!modelItem) return null;

  return (
    <>
      <PanelSection title="Name">
        <TextField
          value={modelItem.name}
          slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
          onChange={(e) => {
            const text = e.target.value as string;
            if (modelItem.name !== text) onModelItemUpdated({ name: text });
          }}
        />
      </PanelSection>
      <PanelSection title="Description">
        <MarkdownEditor
          value={modelItem.description}
          onChange={(text) => {
            if (modelItem.description !== text)
              onModelItemUpdated({ description: text });
          }}
        />
      </PanelSection>
      {modelItem.name && (
        <PanelSection title="Label height">
          <Slider
            marks
            step={20}
            min={60}
            max={280}
            value={node.labelHeight}
            onChange={(_e, newHeight) => {
              const labelHeight = newHeight as number;
              onViewItemUpdated({ labelHeight });
            }}
          />
        </PanelSection>
      )}
      <LayerSection targets={[{ type: 'ITEM', id: node.id }]} />
      <PanelSection>
        <Box>
          <DeleteButton onClick={onDeleted} />
        </Box>
      </PanelSection>
    </>
  );
};
