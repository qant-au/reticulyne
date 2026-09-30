import { useMemo, useState } from 'react';
import { Autocomplete, Button, TextField, Typography } from '@mui/material';
import { AppDialog } from 'src/vendor/accurona-ui';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import { generateId } from 'src/utils';

// lw-068: the keyboard's way to draw a connector. Dragging from a port
// needs a pointer; this asks for the other end by name instead. It
// connects the one node selected when it opened.
interface Props {
  onClose: () => void;
}

interface Option {
  id: string;
  label: string;
}

export const ConnectToDialog = ({ onClose: closeDialog }: Props) => {
  const selection = useUiStateStore((state) => {
    return state.selection;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelItems = useModelStore((state) => {
    return state.items;
  });
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const { visibleView, createConnector, colors } = useScene();
  const [sourceId] = useState(() => {
    return selection.length === 1 && selection[0].type === 'ITEM'
      ? selection[0].id
      : null;
  });
  const [target, setTarget] = useState<Option | null>(null);

  // Back to the canvas, whichever way it opened: from its menu, the menu
  // item that had focus is gone.
  const onClose = () => {
    closeDialog();
    requestAnimationFrame(() => {
      uiStateActions.get().rendererEl?.focus();
    });
  };

  const nameOf = (id: string) => {
    return (
      modelItems.find((m) => {
        return m.id === id;
      })?.name ?? 'Untitled'
    );
  };

  const options = useMemo((): Option[] => {
    const candidates = visibleView.items.filter((item) => {
      return item.id !== sourceId && !item.locked;
    });
    const names = candidates.map((item) => {
      return (
        modelItems.find((m) => {
          return m.id === item.id;
        })?.name ?? 'Untitled'
      );
    });
    return candidates
      .map((item, index) => {
        const model = modelItems.find((m) => {
          return m.id === item.id;
        });
        const icon = icons.find((i) => {
          return i.id === model?.icon;
        });
        // Two nodes of one name are told apart by their icon.
        const repeated =
          names.filter((n) => {
            return n === names[index];
          }).length > 1;
        return {
          id: item.id,
          label:
            repeated && icon?.name
              ? `${names[index]} (${icon.name})`
              : names[index]
        };
      })
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });
  }, [visibleView.items, sourceId, modelItems, icons]);

  const connect = () => {
    if (!sourceId || !target) return;
    const id = generateId();
    createConnector({
      id,
      color: colors[0]?.id,
      anchors: [
        { id: generateId(), ref: { item: sourceId } },
        { id: generateId(), ref: { item: target.id } }
      ]
    });
    uiStateActions.setMode({
      type: 'CURSOR',
      showCursor: true,
      mousedownItem: null
    });
    uiStateActions.setSelection([{ type: 'CONNECTOR', id }]);
    uiStateActions.announce(
      `Connected ${nameOf(sourceId)} to ${nameOf(target.id)}`
    );
    onClose();
  };

  const sourceName = sourceId ? nameOf(sourceId) : null;

  return (
    <AppDialog
      open
      onClose={onClose}
      title={sourceName ? `Connect ${sourceName} to` : 'Connect to'}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="connect-to-form"
            variant="contained"
            disabled={!sourceId || !target}
          >
            Connect
          </Button>
        </>
      }
    >
      {!sourceId || options.length === 0 ? (
        <Typography variant="body2">
          {!sourceId
            ? 'Select one item first, then connect it.'
            : 'There is no other item on this view to connect to.'}
        </Typography>
      ) : (
        <form
          id="connect-to-form"
          onSubmit={(e) => {
            e.preventDefault();
            connect();
          }}
        >
          <Autocomplete
            options={options}
            value={target}
            onChange={(_, value) => {
              setTarget(value);
            }}
            isOptionEqualToValue={(a, b) => {
              return a.id === b.id;
            }}
            autoHighlight
            renderInput={(params) => {
              return (
                <TextField {...params} label="Item" autoFocus margin="dense" />
              );
            }}
          />
        </form>
      )}
    </AppDialog>
  );
};
