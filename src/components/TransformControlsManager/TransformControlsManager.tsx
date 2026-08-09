import { useUiStateStore } from 'src/stores/uiStateStore';
import { ItemReference } from 'src/types';
import { RectangleTransformControls } from './RectangleTransformControls';
import { TextBoxTransformControls } from './TextBoxTransformControls';
import { NodeTransformControls } from './NodeTransformControls';

// Connectors deliberately have no canvas outline — they never had one in
// single-select either; a selected connector is shown by its inspector
// panel. Returning null keeps multi-select consistent with that.
const outlineFor = (item: ItemReference) => {
  switch (item.type) {
    case 'ITEM':
      return <NodeTransformControls key={item.id} id={item.id} />;
    case 'RECTANGLE':
      return (
        <RectangleTransformControls key={item.id} id={item.id} outlineOnly />
      );
    case 'TEXTBOX':
      return <TextBoxTransformControls key={item.id} id={item.id} />;
    default:
      return null;
  }
};

export const TransformControlsManager = () => {
  const itemControls = useUiStateStore((state) => {
    return state.itemControls;
  });
  const selection = useUiStateStore((state) => {
    return state.selection;
  });

  // 1.4: several items selected -> outline every one, no resize anchors.
  if (selection.length > 1) {
    return <>{selection.map(outlineFor)}</>;
  }

  switch (itemControls?.type) {
    case 'ITEM':
      return <NodeTransformControls id={itemControls.id} />;
    case 'RECTANGLE':
      return <RectangleTransformControls id={itemControls.id} />;
    case 'TEXTBOX':
      return <TextBoxTransformControls id={itemControls.id} />;
    default:
      return null;
  }
};
