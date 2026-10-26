import { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { AppDialog } from 'src/kit';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { isMissingIcon } from 'src/icons/missing';
import { packNotices } from 'src/icons/externalPacks';
import { IconGrid } from 'src/components/ItemControls/IconSelectionControls/IconGrid';
import type { Icon } from 'src/types';

// What a diagram just opened lacks (src/icons/externalPacks.ts and
// src/icons/missing.ts): the icon packs it lists that are not loaded, with
// where to get them, and the icons nobody has, drawn as placeholders, each
// with Replace. It follows the editor live: installing a pack it names, or
// replacing an icon, takes that line away.

const isWebUrl = (url: string) => {
  return /^https?:\/\//i.test(url);
};

const plural = (n: number, one: string, many: string) => {
  return n === 1 ? one : many;
};

interface ReplaceProps {
  iconId: string;
  objects: number;
  onClose: () => void;
}

const ReplaceIconDialog = ({ iconId, objects, onClose }: ReplaceProps) => {
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const { replaceIcon } = useScene();
  const [filter, setFilter] = useState('');
  const choices = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return icons.filter((icon) => {
      return (
        !isMissingIcon(icon) &&
        (!needle ||
          icon.name.toLowerCase().includes(needle) ||
          icon.id.toLowerCase().includes(needle))
      );
    });
  }, [icons, filter]);

  const choose = (icon: Icon) => {
    replaceIcon(iconId, icon.id);
    onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Replace a missing icon"
      maxWidth="sm"
      actions={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography>
          Choose the icon to draw the {objects}{' '}
          {plural(objects, 'object', 'objects')} using “{iconId}” with. Their
          ports and connections stay as they are.
        </Typography>
        <TextField
          id="replace-icon-search"
          label="Search icons"
          size="small"
          value={filter}
          autoFocus
          onChange={(e) => {
            setFilter(e.target.value);
          }}
        />
        <Box
          sx={{ maxHeight: 360, overflowY: 'auto' }}
          data-testid="replace-icon-choices"
        >
          {choices.length ? (
            <IconGrid icons={choices.slice(0, 200)} onClick={choose} />
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>
              No icon matches “{filter}”.
            </Typography>
          )}
        </Box>
      </Stack>
    </AppDialog>
  );
};

export const OpenNotice = () => {
  const notice = useUiStateStore((state) => {
    return state.openNotice;
  });
  const packs = useUiStateStore((state) => {
    return state.packs;
  });
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const items = useModelStore((state) => {
    return state.items;
  });
  const [replacing, setReplacing] = useState<{
    iconId: string;
    objects: number;
  } | null>(null);

  // Live: a pack now loaded at the listed version, or an icon no longer a
  // placeholder, is no longer news.
  const lacking = useMemo(() => {
    if (!notice) return null;
    const missingPacks = packNotices({ externalPacks: notice.packs }, packs);
    const missingIcons = notice.icons
      .map((m) => {
        // Counted live: one replaced from its inspector leaves the rest.
        return {
          id: m.id,
          objects: items.filter((item) => {
            return item.icon === m.id;
          }).length
        };
      })
      .filter((m) => {
        const icon = icons.find((i) => {
          return i.id === m.id;
        });
        return icon !== undefined && isMissingIcon(icon) && m.objects > 0;
      });
    return missingPacks.length || missingIcons.length
      ? { missingPacks, missingIcons }
      : null;
  }, [notice, packs, icons, items]);

  if (!lacking) return null;
  const { missingPacks, missingIcons } = lacking;
  const absent = missingPacks.filter((n) => {
    return n.loadedVersion === undefined;
  });
  const otherVersion = missingPacks.filter((n) => {
    return n.loadedVersion !== undefined;
  });

  return (
    <Box
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: 88,
        transform: 'translateX(-50%)',
        width: 'min(560px, calc(100% - 32px))',
        zIndex: 6
      }}
    >
      <Alert
        severity="warning"
        role="status"
        data-testid="open-notice"
        onClose={() => {
          uiStateActions.setOpenNotice(null);
        }}
        sx={{ maxHeight: '40vh', overflowY: 'auto' }}
      >
        <AlertTitle>
          {missingIcons.length
            ? 'Some icons in this diagram are missing'
            : 'This diagram uses icon packs you don’t have'}
        </AlertTitle>
        <Stack spacing={1.5}>
          {absent.length > 0 && (
            <Box>
              <Typography variant="body2">
                {plural(
                  absent.length,
                  'It was drawn with an icon pack that isn’t installed:',
                  'It was drawn with icon packs that aren’t installed:'
                )}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {absent.map(({ pack }) => {
                  return (
                    <li key={pack.id}>
                      <Typography variant="body2">
                        {pack.name}
                        {pack.version ? ` ${pack.version}` : ''}, from{' '}
                        {isWebUrl(pack.sourceUrl) ? (
                          <Link
                            href={pack.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ overflowWrap: 'anywhere' }}
                          >
                            {pack.sourceUrl}
                          </Link>
                        ) : (
                          pack.sourceUrl
                        )}
                      </Typography>
                    </li>
                  );
                })}
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Its icons are drawn from the copies saved in the diagram, so
                they may not match the pack. Install the pack for its devices’
                ports and current drawings.
              </Typography>
            </Box>
          )}
          {otherVersion.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {otherVersion.map(({ pack, loadedVersion }) => {
                return (
                  <li key={pack.id}>
                    <Typography variant="body2">
                      {pack.name}: the diagram was drawn with {pack.version};{' '}
                      {loadedVersion} is installed.
                    </Typography>
                  </li>
                );
              })}
            </Box>
          )}
          {missingIcons.length > 0 && (
            <Box>
              <Typography variant="body2">
                {plural(
                  missingIcons.length,
                  'This icon is in neither the diagram nor the library, so it is drawn as a question mark:',
                  'These icons are in neither the diagram nor the library, so they are drawn as question marks:'
                )}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {missingIcons.map((m) => {
                  return (
                    <Stack
                      key={m.id}
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
                      >
                        {m.id} ({m.objects}{' '}
                        {plural(m.objects, 'object', 'objects')})
                      </Typography>
                      {editable && (
                        <Button
                          size="small"
                          color="inherit"
                          aria-label={`Replace ${m.id}`}
                          onClick={() => {
                            setReplacing({ iconId: m.id, objects: m.objects });
                          }}
                        >
                          Replace…
                        </Button>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </Alert>
      {replacing && (
        <ReplaceIconDialog
          iconId={replacing.iconId}
          objects={replacing.objects}
          onClose={() => {
            setReplacing(null);
          }}
        />
      )}
    </Box>
  );
};
