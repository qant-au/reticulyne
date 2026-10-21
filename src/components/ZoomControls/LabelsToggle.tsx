import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import LabelOffOutlinedIcon from '@mui/icons-material/LabelOffOutlined';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Surface, ToolButton } from 'src/kit';

// Hide or show the nodes' labels. Display only: it changes how the diagram
// looks, not the diagram, so it is there in every mode and never saved.
// Alt+L does the same; the host's `showLabels` prop sets the start.
export const LabelsToggle = () => {
  const labelsVisible = useUiStateStore((state) => {
    return state.labelsVisible;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return (
    <Surface>
      <ToolButton
        name={labelsVisible ? 'Hide labels (Alt+L)' : 'Show labels (Alt+L)'}
        icon={labelsVisible ? <LabelOffOutlinedIcon /> : <LabelOutlinedIcon />}
        isActive={!labelsVisible}
        onClick={uiStateActions.toggleLabelsVisible}
      />
    </Surface>
  );
};
