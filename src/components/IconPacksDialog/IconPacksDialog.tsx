import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  List,
  ListItem,
  Stack,
  Typography
} from '@mui/material';
import { AppDialog } from 'src/kit';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { IconPack } from 'src/icons/pack';
import {
  checkInstall,
  type IconPackUsage,
  type LoadedPack
} from 'src/icons/packRegistry';
import { getItemByIdOrThrow } from 'src/utils';
import type { SelectedRef } from 'src/types';

// Icon packs: the packs loaded in this editor, installing one from a pack
// file, and removing one. Removal is refused while any diagram draws with
// the pack's icons; the refusal lists them, and Show takes the user to the
// objects so they can be removed or replaced first (docs/icon-packs.md).

/** A pack file larger than this is refused before it is read. */
const MAX_FILE_BYTES = 16 * 1024 * 1024;

/** The id the open diagram goes by in a usage list. */
const OPEN_DIAGRAM = '\u0000open';

type Step =
  | { kind: 'list' }
  | { kind: 'replace'; pack: IconPack; old: LoadedPack }
  | { kind: 'remove'; loaded: LoadedPack }
  | { kind: 'checking'; loaded: LoadedPack }
  | { kind: 'in-use'; loaded: LoadedPack; usage: IconPackUsage[] };

const label = (pack: IconPack) => {
  return pack.version ? `${pack.name} ${pack.version}` : pack.name;
};

// FileReader, as Open uses: Blob.text() is missing from older engines.
const readText = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
};

const isWebUrl = (url: string) => {
  return /^https?:\/\//i.test(url);
};

const Source = ({ url }: { url: string }) => {
  return isWebUrl(url) ? (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      {url}
    </Link>
  ) : (
    <span>{url}</span>
  );
};

export const IconPacksDialog = ({ onClose }: { onClose: () => void }) => {
  const packs = useUiStateStore((state) => {
    return state.packs;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const view = useUiStateStore((state) => {
    return state.view;
  });
  const [step, setStep] = useState<Step>({ kind: 'list' });
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handlers = () => {
    return uiStateActions.get().packHandlers;
  };

  const install = async (pack: IconPack) => {
    const result = uiStateActions.installPack(pack, { origin: 'user' });
    if (!result.ok) {
      setErrors(result.errors);
      setStep({ kind: 'list' });
      return;
    }
    setStep({ kind: 'list' });
    setNotice(`Installed ${label(pack)}: ${pack.icons.length} icons.`);
    try {
      await handlers().onIconPackInstall?.(pack);
    } catch (e) {
      setErrors([
        `${pack.name} is installed for now but was not kept: ${
          e instanceof Error ? e.message : 'it could not be stored.'
        }`
      ]);
    }
  };

  const onFile = async (file: File) => {
    setErrors([]);
    setNotice(null);
    if (file.size > MAX_FILE_BYTES) {
      setErrors([`“${file.name}” is larger than 16 MB.`]);
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(await readText(file));
    } catch {
      setErrors([`“${file.name}” is not a JSON file.`]);
      return;
    }
    const checked = checkInstall(packs, value);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    const old = packs.find((p) => {
      return p.pack.id === checked.pack.id;
    });
    if (old) {
      setStep({ kind: 'replace', pack: checked.pack, old });
      return;
    }
    await install(checked.pack);
  };

  // The objects placed in the open diagram that draw with any of these
  // icons. Only placed ones count: an object on no view cannot be seen or
  // deleted, and it carries its own copy of the icon anyway.
  const openUsage = (iconIds: Set<string>): IconPackUsage[] => {
    const model = modelActions.get();
    const placed = new Set(
      model.views.flatMap((v) => {
        return v.items.map((i) => {
          return i.id;
        });
      })
    );
    const objects = model.items
      .filter((item) => {
        return (
          placed.has(item.id) &&
          item.icon !== undefined &&
          iconIds.has(item.icon)
        );
      })
      .map((item) => {
        return { id: item.id, name: item.name || item.id };
      });
    return objects.length
      ? [
          {
            diagramId: OPEN_DIAGRAM,
            diagramName: `${model.title || 'Untitled'} (open now)`,
            objects
          }
        ]
      : [];
  };

  const askRemove = async (loaded: LoadedPack) => {
    setErrors([]);
    setNotice(null);
    const ids = loaded.pack.icons.map((icon) => {
      return icon.id;
    });
    setStep({ kind: 'checking', loaded });
    let others: IconPackUsage[] = [];
    try {
      others =
        (await handlers().iconPackUsage?.(loaded.pack.id, ids))?.filter((u) => {
          return u.objects.length > 0;
        }) ?? [];
    } catch {
      setErrors(['The other diagrams could not be checked.']);
      setStep({ kind: 'list' });
      return;
    }
    const usage = [...openUsage(new Set(ids)), ...others];
    setStep(
      usage.length
        ? { kind: 'in-use', loaded, usage }
        : { kind: 'remove', loaded }
    );
  };

  const remove = async (loaded: LoadedPack) => {
    const result = uiStateActions.removePack(loaded.pack.id);
    setStep({ kind: 'list' });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setNotice(`Removed ${label(loaded.pack)}.`);
    try {
      await handlers().onIconPackRemove?.(loaded.pack.id);
    } catch {
      setErrors([
        `${loaded.pack.name} is removed for now but is still kept here; it will load again next time.`
      ]);
    }
  };

  const show = (usage: IconPackUsage) => {
    const ids = usage.objects.map((o) => {
      return o.id;
    });
    if (usage.diagramId === OPEN_DIAGRAM) {
      const items = (() => {
        try {
          return getItemByIdOrThrow(modelActions.get().views, view).value.items;
        } catch {
          return [];
        }
      })();
      const refs: SelectedRef[] = ids
        .filter((id) => {
          return items.some((i) => {
            return i.id === id;
          });
        })
        .map((id) => {
          return { type: 'ITEM', id };
        });
      uiStateActions.setSelection(refs);
    } else {
      handlers().onShowIconPackUsage?.(usage.diagramId, ids);
    }
    onClose();
  };

  const canShow = (usage: IconPackUsage) => {
    return (
      usage.diagramId === OPEN_DIAGRAM ||
      handlers().onShowIconPackUsage !== undefined
    );
  };

  const actions = (() => {
    if (step.kind === 'replace') {
      return (
        <>
          <Button
            variant="text"
            onClick={() => {
              setStep({ kind: 'list' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            autoFocus
            onClick={() => {
              void install(step.pack);
            }}
          >
            Replace
          </Button>
        </>
      );
    }
    if (step.kind === 'remove') {
      return (
        <>
          <Button
            variant="text"
            onClick={() => {
              setStep({ kind: 'list' });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            autoFocus
            onClick={() => {
              void remove(step.loaded);
            }}
          >
            Remove
          </Button>
        </>
      );
    }
    if (step.kind === 'in-use') {
      return (
        <Button
          variant="contained"
          autoFocus
          onClick={() => {
            setStep({ kind: 'list' });
          }}
        >
          Back to packs
        </Button>
      );
    }
    return (
      // Each step's main button takes the focus when it appears, so the
      // keyboard (Escape included) keeps working after the last one went.
      <Button
        variant="contained"
        autoFocus
        onClick={() => {
          fileInput.current?.click();
        }}
      >
        Install from file…
      </Button>
    );
  })();

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Icon packs"
      maxWidth="sm"
      actions={actions}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="icon-pack-file-input"
        aria-label="Icon pack file"
        onChange={(e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          // Cleared, so choosing the same file again still installs it.
          input.value = '';
          if (file) void onFile(file);
        }}
      />
      <Stack spacing={2}>
        {notice && (
          <Alert
            severity="success"
            onClose={() => {
              return setNotice(null);
            }}
          >
            {notice}
          </Alert>
        )}
        {errors.length > 0 && (
          <Alert
            severity="error"
            onClose={() => {
              return setErrors([]);
            }}
          >
            {errors.length === 1 ? (
              errors[0]
            ) : (
              <>
                <Typography variant="body2">
                  The pack has {errors.length} problems:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {errors.map((error) => {
                    return (
                      <li key={error}>
                        <Typography variant="body2">{error}</Typography>
                      </li>
                    );
                  })}
                </Box>
              </>
            )}
          </Alert>
        )}

        {step.kind === 'replace' && (
          <Typography>
            Replace {label(step.old.pack)} with {label(step.pack)}? Its icons
            and devices are swapped for the new file&apos;s. Diagrams keep the
            copies they saved.
          </Typography>
        )}

        {step.kind === 'remove' && (
          <Typography>
            Remove {label(step.loaded.pack)}? Its{' '}
            {step.loaded.pack.icons.length} icons and its devices leave the
            library. No diagram draws with them.
          </Typography>
        )}

        {step.kind === 'checking' && (
          <Typography>
            Checking which diagrams use {step.loaded.pack.name}…
          </Typography>
        )}

        {step.kind === 'in-use' && (
          <Stack spacing={1} data-testid="icon-pack-usage">
            <Typography>
              {step.loaded.pack.name} can&apos;t be removed while diagrams use
              its icons. Remove or replace these objects first, then remove the
              pack.
            </Typography>
            {step.usage.map((usage) => {
              return (
                <Box
                  key={usage.diagramId}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1
                    }}
                  >
                    <Typography variant="subtitle2">
                      {usage.diagramName}
                    </Typography>
                    {canShow(usage) && (
                      <Button
                        size="small"
                        onClick={() => {
                          show(usage);
                        }}
                        aria-label={`Show the objects in ${usage.diagramName}`}
                      >
                        Show
                      </Button>
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {usage.objects
                      .map((o) => {
                        return o.name;
                      })
                      .join(', ')}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        {step.kind === 'list' &&
          (packs.length === 0 ? (
            <Typography sx={{ color: 'text.secondary' }}>
              No icon packs are installed. A pack is one .json file of icons,
              their flat drawings and their devices&apos; ports; install one
              from a file.
            </Typography>
          ) : (
            <List disablePadding data-testid="icon-pack-list">
              {packs.map((loaded) => {
                const { pack } = loaded;
                return (
                  <ListItem
                    key={pack.id}
                    divider
                    disableGutters
                    data-testid={`icon-pack-${pack.id}`}
                    sx={{ alignItems: 'flex-start', gap: 1 }}
                  >
                    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                      >
                        <Typography variant="subtitle1">
                          {label(pack)}
                        </Typography>
                        <Chip
                          size="small"
                          label={
                            loaded.origin === 'user'
                              ? 'Installed by you'
                              : 'Loaded by the app'
                          }
                        />
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                      >
                        {pack.icons.length} icons
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        Source: <Source url={pack.sourceUrl} />
                      </Typography>
                      {!loaded.removable && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary' }}
                        >
                          Locked by the app: it can&apos;t be removed or
                          replaced here.
                        </Typography>
                      )}
                    </Stack>
                    {loaded.removable && (
                      <Button
                        color="error"
                        onClick={() => {
                          void askRemove(loaded);
                        }}
                        aria-label={`Remove ${pack.name}`}
                      >
                        Remove
                      </Button>
                    )}
                  </ListItem>
                );
              })}
            </List>
          ))}
      </Stack>
    </AppDialog>
  );
};
