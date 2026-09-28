import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import FolderIcon from '@mui/icons-material/FolderOutlined';
import AddIcon from '@mui/icons-material/AddOutlined';
import UploadIcon from '@mui/icons-material/FileUploadOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ExpandIcon from '@mui/icons-material/ExpandMore';
import Reticulyne, { INITIAL_DATA, readIconAsDataUrl } from 'src/Reticulyne';
import { MAIN_MENU_OPTIONS } from 'src/config';
import { UiElement } from 'src/components/UiElement/UiElement';
import { generateId } from 'src/utils';
import { initialDataSchema } from 'src/schemas/model';
import type {
  Colors,
  Icon,
  InitialData,
  Model,
  ReticulyneProps
} from 'src/types';
import {
  createDiagramStorage,
  type DiagramEntry,
  type DiagramStorage
} from './diagramStorage';

// APP-01: the Docker editor as a small app. Diagrams live in this
// browser's localStorage; a "Diagrams" menu at the top creates, imports,
// switches and deletes them. Saving uses the editor's own save support
// (the Save menu entry, the status pill, the leave-page warning), with
// auto-save every 5 s once a diagram has a name. The library's own Open
// entry is swapped for Import here, because Open loads a file over the
// diagram that is open and the next save would overwrite it.

const AUTO_SAVE_MS = 5000;

interface Current {
  id: string;
  data: InitialData;
  /** Set once the diagram has been saved at least once. */
  stored: boolean;
}

// Compared to tell whether there are unsaved changes. Icons are left out:
// the bundled packs are large and never change.
const fingerprint = (model: Model) => {
  return JSON.stringify({ ...model, icons: undefined, fitToView: undefined });
};

const relativeTime = (ms: number) => {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ms).toLocaleDateString();
};

interface BarProps {
  currentId: string;
  entries: DiagramEntry[];
  error: string | null;
  onClearError: () => void;
  onNew: () => void;
  onImport: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const DiagramBar = ({
  currentId,
  entries,
  error,
  onClearError,
  onNew,
  onImport,
  onOpen,
  onDelete
}: BarProps) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const close = () => {
    setAnchor(null);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        // Level with the editor's toolbar.
        top: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        maxWidth: 'calc(100% - 32px)',
        zIndex: 5
      }}
    >
      <UiElement>
        <Button
          variant="text"
          startIcon={<FolderIcon />}
          endIcon={<ExpandIcon />}
          onClick={(e) => {
            setAnchor(e.currentTarget);
          }}
          sx={{
            textTransform: 'none',
            color: 'text.secondary',
            fontWeight: 600,
            height: 40,
            px: 1.5
          }}
        >
          Diagrams
        </Button>
      </UiElement>
      {error && (
        <Alert severity="error" onClose={onClearError} sx={{ maxWidth: 420 }}>
          {error}
        </Alert>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept="application/json,.json"
        data-testid="diagram-import-input"
        onChange={(e) => {
          const el = e.currentTarget;
          const file = el.files?.[0];
          el.value = '';
          if (file) onImport(file);
        }}
      />
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        slotProps={{ paper: { sx: { minWidth: 280, maxHeight: 440 } } }}
      >
        <MenuItem
          onClick={() => {
            close();
            onNew();
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New diagram</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            fileInput.current?.click();
          }}
        >
          <ListItemIcon>
            <UploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import from file…</ListItemText>
        </MenuItem>
        <Divider />
        {entries.length === 0 && (
          <MenuItem disabled>
            <ListItemText secondary="Saved diagrams appear here." />
          </MenuItem>
        )}
        {entries.map((entry) => {
          return (
            <MenuItem
              key={entry.id}
              selected={entry.id === currentId}
              onClick={() => {
                close();
                if (entry.id !== currentId) onOpen(entry.id);
              }}
            >
              <ListItemIcon>
                {entry.id === currentId && <CheckIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary={entry.name}
                secondary={relativeTime(entry.updatedAt)}
              />
              <IconButton
                edge="end"
                size="small"
                aria-label={`Delete ${entry.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  onDelete(entry.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          );
        })}
        <Divider />
        <Typography
          variant="caption"
          sx={{ display: 'block', px: 2, py: 0.5, color: 'text.secondary' }}
        >
          Saved in this browser only.
        </Typography>
      </Menu>
    </Box>
  );
};

interface ShellProps {
  bundledIcons: Icon[];
  colors: Colors;
  /** Opens this instead of the last diagram (the e2e hook). */
  initialData?: InitialData;
  /** Passed through to <Reticulyne>; the e2e hook uses it. */
  editorProps?: Partial<ReticulyneProps>;
  storage?: Storage;
}

export const DiagramShell = ({
  bundledIcons,
  colors,
  initialData,
  editorProps = {},
  storage = window.localStorage
}: ShellProps) => {
  const store: DiagramStorage = useMemo(() => {
    return createDiagramStorage(storage, bundledIcons);
  }, [storage, bundledIcons]);

  const blank = useCallback((): Current => {
    return {
      id: generateId(),
      data: { ...INITIAL_DATA, icons: bundledIcons, colors },
      stored: false
    };
  }, [bundledIcons, colors]);

  const [current, setCurrent] = useState<Current>(() => {
    if (initialData) {
      return { id: generateId(), data: initialData, stored: false };
    }
    const last = store.getCurrent();
    const model = last ? store.load(last) : null;
    return last && model ? { id: last, data: model, stored: true } : blank();
  });
  const [entries, setEntries] = useState(() => {
    return store.list();
  });
  const [title, setTitle] = useState(current.data.title ?? 'Untitled');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    message: string;
    action: string;
    run: () => void;
  } | null>(null);

  // The window title is the diagram's name: it is what an installed app
  // (APP-02) shows in its title bar and the OS window switcher.
  useEffect(() => {
    document.title = `${title} | Reticulyne`;
  }, [title]);

  // What was last loaded or saved, to tell whether there is unsaved work.
  // The baseline is the first model the editor reports after a load: the
  // loaded data and the normalised model differ in shape (defaults filled
  // in), so fingerprinting the data itself would read as unsaved at once.
  const savedPrint = useRef('');
  const latestPrint = useRef('');
  const baselinePending = useRef(true);
  const isDirty = () => {
    return latestPrint.current !== savedPrint.current;
  };

  const show = (next: Current) => {
    baselinePending.current = true;
    setTitle(next.data.title ?? 'Untitled');
    setError(null);
    setCurrent(next);
    if (next.stored) store.setCurrent(next.id);
  };

  // Leaving a diagram with unsaved changes asks first.
  const leave = (label: string, go: () => void) => {
    if (!isDirty()) {
      go();
      return;
    }
    setConfirm({
      message: `“${title}” has unsaved changes. ${label} anyway? The changes will be lost.`,
      action: 'Discard changes',
      run: go
    });
  };

  const onSave = useCallback(
    async (model: Model) => {
      try {
        store.save(current.id, model);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The diagram was not saved.');
        throw e;
      }
      store.setCurrent(current.id);
      savedPrint.current = fingerprint(model);
      setEntries(store.list());
      setError(null);
    },
    [store, current.id]
  );

  const onModelUpdated = useCallback((model: Model) => {
    latestPrint.current = fingerprint(model);
    if (baselinePending.current) {
      baselinePending.current = false;
      savedPrint.current = latestPrint.current;
    }
    setTitle(model.title);
  }, []);

  const onImport = (file: File) => {
    leave('Import a file', () => {
      file
        .text()
        .then((text) => {
          let data: InitialData;
          try {
            data = JSON.parse(text) as InitialData;
          } catch {
            setError(
              `“${file.name}” is not a diagram file (it is not valid JSON).`
            );
            return;
          }
          // Checked before switching, so a file that is JSON but not a
          // diagram leaves the current one open with an error, instead of
          // swapping to data the editor then refuses.
          const own = (Array.isArray(data?.icons) ? data.icons : []).filter(
            (icon) => {
              return !bundledIcons.some((b) => {
                return b.id === icon.id;
              });
            }
          );
          const next = { ...data, icons: [...bundledIcons, ...own] };
          if (
            typeof data !== 'object' ||
            data === null ||
            Array.isArray(data) ||
            !initialDataSchema.safeParse(next).success
          ) {
            setError(`“${file.name}” is not a valid diagram.`);
            return;
          }
          show({ id: generateId(), data: next, stored: false });
        })
        .catch(() => {
          setError(`“${file.name}” could not be read.`);
        });
    });
  };

  return (
    <>
      <Reticulyne
        initialData={current.data}
        mainMenuOptions={[
          ...MAIN_MENU_OPTIONS.filter((option) => {
            return option !== 'ACTION.OPEN';
          }),
          'ACTION.SAVE'
        ]}
        onSave={onSave}
        autoSaveDebounce={title === 'Untitled' ? false : AUTO_SAVE_MS}
        onModelUpdated={onModelUpdated}
        onValidationError={() => {
          setError('That file is not a valid diagram.');
        }}
        onIconUpload={readIconAsDataUrl}
        {...editorProps}
      >
        <DiagramBar
          currentId={current.id}
          entries={entries}
          error={error}
          onClearError={() => {
            setError(null);
          }}
          onNew={() => {
            leave('Start a new diagram', () => {
              show(blank());
            });
          }}
          onImport={onImport}
          onOpen={(id) => {
            leave('Open another diagram', () => {
              const model = store.load(id);
              if (model) show({ id, data: model, stored: true });
              else setError('That diagram could not be read.');
            });
          }}
          onDelete={(id) => {
            const entry = entries.find((e) => {
              return e.id === id;
            });
            setConfirm({
              message: `Delete “${entry?.name ?? 'this diagram'}”? This cannot be undone.`,
              action: 'Delete',
              run: () => {
                store.remove(id);
                setEntries(store.list());
                if (id === current.id) show(blank());
              }
            });
          }}
        />
        <Dialog
          open={confirm !== null}
          onClose={() => {
            setConfirm(null);
          }}
        >
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogContent>
            <Typography>{confirm?.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setConfirm(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                const run = confirm?.run;
                setConfirm(null);
                run?.();
              }}
            >
              {confirm?.action}
            </Button>
          </DialogActions>
        </Dialog>
      </Reticulyne>
    </>
  );
};
