import { useState } from 'react';
import { Button, TextField } from '@mui/material';
import { AppDialog } from 'src/vendor/accurona-ui';
import { useModelStore } from 'src/stores/modelStore';

// rename the diagram from the main menu. Writes the model's
// title directly; renaming is not part of the drawing's undo history.
const MAX_LENGTH = 100;

interface Props {
  onClose: () => void;
}

export const RenameDiagramDialog = ({ onClose }: Props) => {
  const title = useModelStore((state) => {
    return state.title;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const [value, setValue] = useState(title);

  const save = () => {
    modelActions.set({ title: value.trim() || 'Untitled' });
    onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Rename diagram"
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rename-diagram-form" variant="contained">
            Rename
          </Button>
        </>
      }
    >
      <form
        id="rename-diagram-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField
          id="rename-diagram-title"
          label="Title"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.slice(0, MAX_LENGTH));
          }}
          helperText={`${value.length} / ${MAX_LENGTH}. Left blank, it becomes “Untitled”.`}
          autoFocus
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { maxLength: MAX_LENGTH } }}
        />
      </form>
    </AppDialog>
  );
};
