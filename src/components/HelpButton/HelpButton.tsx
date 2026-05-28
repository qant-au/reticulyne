import { HelpOutlined as HelpOutlineIcon } from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { IconButton } from 'src/components/IconButton/IconButton';
import { useUiStateStore } from 'src/stores/uiStateStore';

export const HelpButton = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  return (
    <UiElement>
      <IconButton
        name="Keyboard shortcuts (?)"
        Icon={<HelpOutlineIcon />}
        onClick={() => {
          uiStateActions.setDialog('KEYBOARD_SHORTCUTS');
        }}
      />
    </UiElement>
  );
};
