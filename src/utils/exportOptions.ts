import { toPng } from 'html-to-image';
import FileSaver from 'file-saver';
import { Model, Size } from '../types';

export const generateGenericFilename = (extension: string) => {
  return `isoflow-export-${new Date().toISOString()}.${extension}`;
};

export const base64ToBlob = (
  base64: string,
  contentType: string,
  sliceSize = 512
) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });

  return blob;
};

export const downloadFile = (data: Blob, filename: string) => {
  FileSaver.saveAs(data, filename);
};

export const exportAsJSON = (model: Model) => {
  const data = new Blob([JSON.stringify(model)], {
    type: 'application/json;charset=utf-8'
  });

  downloadFile(data, generateGenericFilename('json'));
};

export const exportAsImage = async (el: HTMLDivElement, size?: Size) => {
  // Wait for any pending web-font loads before rasterising. Without
  // this, html-to-image may capture node labels rendered in the
  // browser's fallback font (different glyph metrics → truncated or
  // wrong-width text) when the user triggers export before the
  // configured font has streamed in. Falls back to an immediate
  // resolution on browsers that don't expose document.fonts.
  if (
    typeof document !== 'undefined' &&
    document.fonts &&
    typeof document.fonts.ready?.then === 'function'
  ) {
    try {
      await document.fonts.ready;
    } catch {
      // Best-effort; proceed with whatever fonts are currently loaded.
    }
  }

  const imageData = await toPng(el, {
    ...size,
    cacheBust: true
  });

  return imageData;
};
