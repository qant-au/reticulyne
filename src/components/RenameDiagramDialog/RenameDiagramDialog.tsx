import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';
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
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <DialogTitle>Rename diagram</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Rename
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
