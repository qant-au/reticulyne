import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { IconSelectionControls } from 'src/components/ItemControls/IconSelectionControls/IconSelectionControls';
import { NodeControls } from './NodeControls/NodeControls';
import { ConnectorControls } from './ConnectorControls/ConnectorControls';
import { TextBoxControls } from './TextBoxControls/TextBoxControls';
import { RectangleControls } from './RectangleControls/RectangleControls';
import { MultiSelectControls } from './MultiSelectControls/MultiSelectControls';

export const ItemControlsManager = () => {
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });
  const selectionCount = useUiStateStore((state) => {
    return state.selection.length;
  });

  const Controls = useMemo(() => {
    // 1.4: multi-selection wins over the single-item panels. ADD_ITEM never
    // coexists with a selection (the store empties one when setting the
    // other), so there is no ordering conflict with the icon picker.
    if (selectionCount > 1) return <MultiSelectControls />;

    switch (itemControls?.type) {
      case 'ITEM':
        return <NodeControls key={itemControls.id} id={itemControls.id} />;
      case 'CONNECTOR':
        return <ConnectorControls key={itemControls.id} id={itemControls.id} />;
      case 'TEXTBOX':
        return <TextBoxControls key={itemControls.id} id={itemControls.id} />;
      case 'RECTANGLE':
        return <RectangleControls key={itemControls.id} id={itemControls.id} />;
      case 'ADD_ITEM':
        return <IconSelectionControls />;
      default:
        return null;
    }
  }, [itemControls, selectionCount]);

  return (
    <Box
      sx={{
        width: '100%'
      }}
    >
      {Controls}
    </Box>
  );
};
