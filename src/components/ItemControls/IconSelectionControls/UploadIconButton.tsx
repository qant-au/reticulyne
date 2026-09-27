import { useRef, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import UploadIcon from '@mui/icons-material/FileUploadOutlined';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { iconSchema } from 'src/schemas/icons';
import {
  CUSTOM_ICON_COLLECTION,
  ICON_UPLOAD_TYPES,
  MAX_ICON_UPLOAD_BYTES,
  generateId,
  iconNameFromFile
} from 'src/utils';

// ROADMAP 2.13: "Upload icon" in the picker. The host stores the file
// (onIconUpload) and hands back a URL; the icon joins the diagram's
// "My icons" collection and is armed for placing, like a picked icon.
export const UploadIconButton = () => {
  const onIconUpload = useUiStateStore((state) => {
    return state.onIconUpload;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!onIconUpload || editorMode !== 'EDITABLE') return null;

  const upload = async (file: File) => {
    setError(null);
    if (!ICON_UPLOAD_TYPES.includes(file.type)) {
      setError('Use an SVG, PNG, JPEG, GIF or WebP image.');
      return;
    }
    if (file.size > MAX_ICON_UPLOAD_BYTES) {
      setError('That image is over 200 KB.');
      return;
    }
    setBusy(true);
    try {
      const result = await onIconUpload(file);
      const { icons } = modelActions.get();
      // The same image uploaded twice is one icon, not two.
      const existing = icons.find((icon) => {
        return (
          icon.collection === CUSTOM_ICON_COLLECTION && icon.url === result.url
        );
      });
      let iconId = existing?.id;
      if (!iconId) {
        const parsed = iconSchema.safeParse({
          id: generateId(),
          name: (result.name ?? iconNameFromFile(file)).slice(0, 100),
          url: result.url,
          collection: CUSTOM_ICON_COLLECTION
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Invalid icon URL.');
          return;
        }
        iconId = parsed.data.id;
        modelActions.set({ icons: [...icons, parsed.data] });
        const categories = uiStateActions.get().iconCategoriesState;
        if (
          !categories.some((c) => {
            return c.id === CUSTOM_ICON_COLLECTION;
          })
        ) {
          uiStateActions.setIconCategoriesState([
            { id: CUSTOM_ICON_COLLECTION, isExpanded: true },
            ...categories
          ]);
        }
      }
      uiStateActions.setMode({
        type: 'PLACE_ICON',
        showCursor: true,
        id: iconId
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<UploadIcon />}
        disabled={busy}
        onClick={() => {
          input.current?.click();
        }}
      >
        {busy ? 'Uploading…' : 'Upload icon'}
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        data-testid="icon-upload-input"
        accept={ICON_UPLOAD_TYPES.join(',')}
        onChange={(e) => {
          const el = e.currentTarget;
          const file = el.files?.[0];
          // Cleared so choosing the same file again still fires onChange.
          el.value = '';
          if (file) void upload(file);
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
  );
};
