import { toPng } from 'html-to-image';
import FileSaver from 'file-saver';
import { jsPDF } from 'jspdf';
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

/**
 * Render the current canvas to a PNG (via the existing exportAsImage
 * path) and embed it in a single-page PDF that gets downloaded
 * client-side. Used by the MainMenu's "Export as PDF" entry.
 *
 * Client-side only: this never makes a network call. The PDF is built
 * in-browser by jsPDF and saved via FileSaver. The page orientation
 * (portrait vs landscape) follows the rendered image's aspect ratio
 * so the diagram fills the page in whichever orientation matches it
 * better. Page size is fixed to A4; the image is scaled to fit the
 * page while preserving aspect ratio, with a small uniform margin.
 *
 * Added under FEA4-04 of the fourth-pass review.
 */
export const exportAsPdf = async (el: HTMLDivElement, size?: Size) => {
  const imageDataUrl = await exportAsImage(el, size);

  // The img object lets us read the rendered PNG's natural pixel
  // dimensions without parsing the data-URL ourselves.
  const img = new Image();
  img.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      resolve();
    };
    img.onerror = () => {
      reject(new Error('Failed to load the rendered image.'));
    };
  });

  const orientation: 'portrait' | 'landscape' =
    img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait';

  // A4 in mm; jsPDF lets us pick units explicitly.
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  // Scale-to-fit while preserving aspect ratio.
  const widthRatio = availableWidth / img.naturalWidth;
  const heightRatio = availableHeight / img.naturalHeight;
  const scale = Math.min(widthRatio, heightRatio);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const offsetX = (pageWidth - drawWidth) / 2;
  const offsetY = (pageHeight - drawHeight) / 2;

  doc.addImage(imageDataUrl, 'PNG', offsetX, offsetY, drawWidth, drawHeight);

  const blob = doc.output('blob');
  downloadFile(blob, generateGenericFilename('pdf'));
};
