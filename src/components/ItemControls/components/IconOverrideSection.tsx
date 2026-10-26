import { useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/FileUploadOutlined';
import { PanelSection } from 'src/kit';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useIcon } from 'src/hooks/useIcon';
import { iconOverrideSchema, type IconOverride } from 'src/core';
import { ICON_UPLOAD_TYPES, uploadIconFile } from 'src/utils';
import type { ModelItem } from 'src/types';

type Which = 'url' | 'flatUrl';

const ROWS: { which: Which; label: string; testId: string }[] = [
  { which: 'url', label: 'Isometric', testId: 'icon-override-iso' },
  { which: 'flatUrl', label: 'Flat', testId: 'icon-override-flat' }
];

// Icon images: this one object's drawing replaced in either view with an
// uploaded image, laid over its icon. The icon in the library, the other
// objects using it and this object's ports are not changed; Remove brings
// the icon's own drawing back. Copy and paste carries an override; a new
// object dragged from the library starts without one.
export const IconOverrideSection = ({
  item,
  onChange
}: {
  item: ModelItem;
  onChange: (iconOverride: IconOverride | undefined) => void;
}) => {
  const onIconUpload = useUiStateStore((state) => {
    return state.onIconUpload;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const { icon } = useIcon(item.icon);
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<Which>('url');
  const [busy, setBusy] = useState<Which | null>(null);
  const [error, setError] = useState<string | null>(null);
  const override = item.iconOverride;

  if (editorMode !== 'EDITABLE') return null;
  // Nowhere to upload to and nothing to remove: no section.
  if (!onIconUpload && !override) return null;

  const set = (which: Which, url: string | undefined) => {
    const next = { ...override, [which]: url };
    if (!next.url) delete next.url;
    if (!next.flatUrl) delete next.flatUrl;
    if (!next.url && !next.flatUrl) {
      onChange(undefined);
      return;
    }
    const parsed = iconOverrideSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid image URL.');
      return;
    }
    onChange(parsed.data);
  };

  const upload = async (file: File, which: Which) => {
    if (!onIconUpload) return;
    setError(null);
    setBusy(which);
    try {
      const result = await uploadIconFile(file, onIconUpload);
      set(which, result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const shown = (which: Which) => {
    if (which === 'url') return override?.url ?? icon.url;
    return override?.flatUrl ?? icon.flatUrl ?? icon.url;
  };

  return (
    <PanelSection title="Icon images">
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Replace this object&apos;s drawing in either view. The icon in the
          library and the object&apos;s connections stay as they are.
        </Typography>
        {ROWS.map(({ which, label, testId }) => {
          const own = !!override?.[which];
          return (
            <Stack
              key={which}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
              data-testid={testId}
            >
              <Box
                component="img"
                src={shown(which) || undefined}
                alt=""
                sx={{ width: 40, height: 40, objectFit: 'contain' }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2">{label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {own ? 'Uploaded' : "The icon's own"}
                </Typography>
              </Box>
              {onIconUpload && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<UploadIcon />}
                  disabled={busy !== null}
                  aria-label={`Upload ${label.toLowerCase()} image`}
                  onClick={() => {
                    setTarget(which);
                    input.current?.click();
                  }}
                >
                  {busy === which ? 'Uploading…' : 'Upload'}
                </Button>
              )}
              {own && (
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  aria-label={`Remove ${label.toLowerCase()} image`}
                  onClick={() => {
                    set(which, undefined);
                  }}
                >
                  Remove
                </Button>
              )}
            </Stack>
          );
        })}
        <input
          ref={input}
          type="file"
          hidden
          data-testid="icon-override-input"
          accept={ICON_UPLOAD_TYPES.join(',')}
          onChange={(e) => {
            const el = e.currentTarget;
            const file = el.files?.[0];
            // Cleared so choosing the same file again still fires onChange.
            el.value = '';
            if (file) void upload(file, target);
          }}
        />
        {error && (
          <Alert
            severity="error"
            onClose={() => {
              setError(null);
            }}
          >
            {error}
          </Alert>
        )}
      </Stack>
    </PanelSection>
  );
};
