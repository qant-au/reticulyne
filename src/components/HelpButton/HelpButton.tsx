import { HelpOutlined as HelpOutlineIcon } from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { IconButton } from 'src/components/IconButton/IconButton';
import { useUiStateStore } from 'src/stores/uiStateStore';

export const HelpButton = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const dialog = useUiStateStore((state) => {
    return state.dialog;
  });

  return (
    <UiElement>
      <IconButton
        name="Keyboard shortcuts (?)"
        Icon={<HelpOutlineIcon />}
        onClick={() => {
          if (dialog === 'KEYBOARD_SHORTCUTS') {
            uiStateActions.setDialog(null);
          } else {
            uiStateActions.setDialog('KEYBOARD_SHORTCUTS');
          }
        }}
      />
    </UiElement>
  );
};
