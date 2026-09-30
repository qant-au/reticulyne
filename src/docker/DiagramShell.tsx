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
import { generateId } from 'src/utils';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type {
  Colors,
  Icon,
  InitialData,
  Model,
  ReticulyneProps
} from 'src/types';
import { parseJson, type Scene } from 'src/vendor/accurona-core';
import {
  createDiagramStorage,
  type DiagramEntry,
  type DiagramStorage
} from './diagramStorage';
import { Surface } from 'src/vendor/accurona-ui';

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
  /** A stored or imported diagram is a scene; a new one starts as a model. */
  data: Scene | InitialData;
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
  // Below sm the inspector card spans the width under the toolbar, where
  // this bar sits; it steps aside while the card is open.
  const inspectorOpen = useUiStateStore((state) => {
    return state.itemControls !== null;
  });
  // Below md it shares the top-right with the icon library, over whose
  // search box it sat.
  const libraryOpen = useUiStateStore((state) => {
    return state.iconPaletteOpen;
  });
  const close = () => {
    setAnchor(null);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        // Level with the editor's toolbar, centred. Narrower than md, a
        // centred bar sat on top of the toolbar's buttons, so it drops
        // below the toolbar on the right (and loses its label below sm).
        top: { xs: 96, md: 40 },
        left: { xs: 'auto', md: '50%' },
        right: { xs: 16, md: 'auto' },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        flexDirection: 'column',
        alignItems: { xs: 'flex-end', md: 'center' },
        display: libraryOpen
          ? { xs: 'none', md: 'flex' }
          : inspectorOpen
            ? { xs: 'none', sm: 'flex' }
            : 'flex',
        gap: 1,
        maxWidth: 'calc(100% - 32px)',
        zIndex: 5
      }}
    >
      <Surface>
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
          aria-label="Diagrams"
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Diagrams
          </Box>
        </Button>
      </Surface>
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
  initialData?: Scene | InitialData;
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

  // The e2e hook's diagram opens as an imported one does: with the bundled
  // icons put back, and checked first. Unchecked, one the editor refused
  // (say, naming an icon it does not carry) left a blank white page.
  const [initialOk] = useState(() => {
    return !initialData || store.open(initialData) !== null;
  });
  const [current, setCurrent] = useState<Current>(() => {
    if (initialData && initialOk) {
      return {
        id: generateId(),
        data: store.withBundledIcons(initialData),
        stored: false
      };
    }
    if (initialData) return blank();
    const last = store.getCurrent();
    // load() validates: one the editor would refuse (saved by an older
    // build that let a field run past the schema) gave a blank page on
    // every reload.
    const scene = last ? store.load(last) : null;
    return last && scene ? { id: last, data: scene, stored: true } : blank();
  });
  const [entries, setEntries] = useState(() => {
    return store.list();
  });
  const [title, setTitle] = useState(current.data.title ?? 'Untitled');
  const [error, setError] = useState<string | null>(() => {
    if (!initialOk) {
      return 'That diagram is not valid, so a new one was started.';
    }
    const last = initialData ? null : store.getCurrent();
    return last && current.id !== last
      ? 'The last diagram could not be opened; a new one was started.'
      : null;
  });
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

  // Saves are scenes. The editor builds each one from the model it last
  // reported, so that model's fingerprint is what is now saved.
  const onSave = useCallback(
    async (scene: Scene) => {
      try {
        store.save(current.id, scene);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The diagram was not saved.');
        throw e;
      }
      store.setCurrent(current.id);
      savedPrint.current = latestPrint.current;
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
          let data: unknown;
          try {
            data = parseJson(text);
          } catch {
            setError(
              `“${file.name}” is not a diagram file (it is not valid JSON).`
            );
            return;
          }
          // Checked before switching, so a file that is JSON but not a
          // diagram leaves the current one open with an error, instead of
          // swapping to data the editor then refuses. A scene is read as
          // it is; a legacy model is converted to one.
          const id = generateId();
          const next = store.open(data, id);
          if (!next) {
            setError(`“${file.name}” is not a valid diagram.`);
            return;
          }
          // Saved straight away: opened unedited it was never auto-saved,
          // so it was missing from the list and gone after a reload.
          try {
            store.save(id, next);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'The diagram was not saved.'
            );
            show({ id, data: next, stored: false });
            return;
          }
          setEntries(store.list());
          show({ id, data: next, stored: true });
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
        onDiagramReplaced={() => {
          // A template or Clear starts a new diagram: without a fresh id,
          // the next auto-save wrote it over the saved one that was open.
          baselinePending.current = true;
          setCurrent((c) => {
            return { ...c, id: generateId(), stored: false };
          });
        }}
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
              const scene = store.load(id);
              if (scene) {
                show({ id, data: scene, stored: true });
              } else setError('That diagram could not be read.');
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
