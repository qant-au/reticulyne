import { SCHEMA_LIMITS } from 'src/schemas/common';

// uploaded icons. The host stores the file and returns a URL
// (`onIconUpload`); `readIconAsDataUrl` is a ready-made handler that keeps
// the icon inside the diagram JSON instead, as a data: URL.

/** The collection uploaded icons are filed under in the picker. */
export const CUSTOM_ICON_COLLECTION = 'My icons';

/** Largest file the picker will hand to `onIconUpload`. */
export const MAX_ICON_UPLOAD_BYTES = 200 * 1024;

export const ICON_UPLOAD_TYPES = [
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
];

/**
 * Whether the browser can actually draw this file. The type is only what
 * the file claims: a text file named .png passed every check and was
 * placed as a broken image, its alt text drawn on the canvas and in every
 * export.
 */
export const isDrawableImage = (file: Blob): Promise<boolean> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (ok: boolean) => {
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    img.onload = () => {
      done(img.naturalWidth > 0 && img.naturalHeight > 0);
    };
    img.onerror = () => {
      done(false);
    };
    img.src = url;
  });
};

/** The file name without its extension, as a starting icon name. */
export const iconNameFromFile = (file: File): string => {
  return (file.name.replace(/\.[^.]+$/, '') || 'Icon').slice(0, 100);
};

/**
 * An `onIconUpload` handler that needs no server: the icon is embedded in
 * the diagram as a data: URL, so it travels with the JSON. The schema caps
 * an icon URL at 64 KB, which is a file of about 48 KB; larger files are
 * refused with a message the picker shows.
 */
export const readIconAsDataUrl = (
  file: File
): Promise<{ url: string; name: string }> => {
  return new Promise((resolve, reject) => {
    if (!ICON_UPLOAD_TYPES.includes(file.type)) {
      reject(new Error('Use an SVG, PNG, JPEG, GIF or WebP image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('The file could not be read.'));
    };
    reader.onload = () => {
      const url = String(reader.result);
      if (url.length > SCHEMA_LIMITS.ICON_URL_MAX) {
        reject(
          new Error(
            'That image is too large to embed in the diagram (about 48 KB at most).'
          )
        );
        return;
      }
      resolve({ url, name: iconNameFromFile(file) });
    };
    reader.readAsDataURL(file);
  });
};
