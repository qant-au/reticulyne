import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Surface, ToolButton } from 'src/vendor/accurona-ui';

export const HelpButton = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const dialog = useUiStateStore((state) => {
    return state.dialog;
  });

  return (
    <Surface>
      <ToolButton
        name="Keyboard shortcuts (?)"
        icon={<HelpOutlineIcon />}
        onClick={() => {
          if (dialog === 'KEYBOARD_SHORTCUTS') {
            uiStateActions.setDialog(null);
          } else {
            uiStateActions.setDialog('KEYBOARD_SHORTCUTS');
          }
        }}
      />
    </Surface>
  );
};
