import { toPng, toSvg } from 'html-to-image';
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

/**
 * Convert an <img> src to a base64 data URI. Returns the src unchanged
 * if it is already a data URI.
 */
const fetchAsDataUri = async (src: string): Promise<string> => {
  if (src.startsWith('data:')) return src;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch icon: ${res.status}`);
  const fetchedBlob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fetchedBlob);
  });
};

/**
 * Export the rendered scene as a true-flat SVG by walking the live DOM
 * and lifting scene SVG elements into a root <svg>. Icons are inlined as
 * data: URIs. Animated connectors become static (animateMotion stripped).
 * TextBox text is not captured (use exportAsUniversalSvg for full fidelity).
 *
 * Two DOM patterns are handled:
 *   - IsoTileArea: the <svg> element itself carries position:absolute + CSS matrix
 *   - Connectors:  a <div> carries position:absolute + CSS matrix; its direct child is the <svg>
 */
export const exportAsVectorSvg = async (
  el: HTMLElement,
  bgColor: string
): Promise<void> => {
  const ns = 'http://www.w3.org/2000/svg';
  const w = el.offsetWidth;
  const h = el.offsetHeight;

  const root = document.createElementNS(ns, 'svg');
  root.setAttribute('xmlns', ns);
  root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  root.setAttribute('width', String(w));
  root.setAttribute('height', String(h));

  if (bgColor && bgColor !== 'transparent') {
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', bgColor);
    root.appendChild(bg);
  }

  // Locate the SceneLayer — the direct child of `el` that is the
  // nearest positioned ancestor of the scene SVG elements.
  // Its offsetLeft/offsetTop (which ignore CSS transform, unlike BCR)
  // give the scene-space origin offset within the renderer container.
  let sceneOffsetX = 0;
  let sceneOffsetY = 0;
  const firstSvg = el.querySelector<SVGSVGElement>('svg');
  if (firstSvg) {
    let cur: HTMLElement | null = firstSvg.parentElement;
    while (cur && cur.parentElement !== el) {
      cur = cur.parentElement as HTMLElement | null;
    }
    if (cur) {
      sceneOffsetX = cur.offsetLeft;
      sceneOffsetY = cur.offsetTop;
    }
  }

  // Pattern 1: <svg style="position:absolute; left:X; top:Y; transform:matrix(...)">
  el.querySelectorAll<SVGSVGElement>('svg').forEach((svgEl) => {
    if (svgEl.style.position !== 'absolute') return;
    const x = parseFloat(svgEl.style.left) || 0;
    const y = parseFloat(svgEl.style.top) || 0;
    const cssTransform = svgEl.style.transform || '';
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('animateMotion').forEach((a) => a.remove());
    clone.style.position = '';
    clone.style.left = '';
    clone.style.top = '';
    clone.style.transform = '';
    clone.style.transformOrigin = '';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute(
      'transform',
      `translate(${x + sceneOffsetX} ${y + sceneOffsetY})${cssTransform ? ` ${cssTransform}` : ''}`
    );
    g.appendChild(clone);
    root.appendChild(g);
  });

  // Pattern 2: <div style="position:absolute; left:X; top:Y; transform:matrix(...)"><svg>...</svg></div>
  el.querySelectorAll<HTMLElement>('div').forEach((divEl) => {
    if (divEl.style.position !== 'absolute') return;
    const svgChild = divEl.querySelector<SVGSVGElement>(':scope > svg');
    if (!svgChild) return;
    // Skip IsoTileArea SVGs already handled in Pattern 1.
    if (svgChild.style.position === 'absolute') return;
    const x = parseFloat(divEl.style.left) || 0;
    const y = parseFloat(divEl.style.top) || 0;
    const cssTransform = divEl.style.transform || '';
    const clone = svgChild.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('animateMotion').forEach((a) => a.remove());
    const g = document.createElementNS(ns, 'g');
    g.setAttribute(
      'transform',
      `translate(${x + sceneOffsetX} ${y + sceneOffsetY})${cssTransform ? ` ${cssTransform}` : ''}`
    );
    g.appendChild(clone);
    root.appendChild(g);
  });

  // Icons: <img> elements — convert to <image href="data:...">
  const containerRect = el.getBoundingClientRect();
  const imgPromises = Array.from(
    el.querySelectorAll<HTMLImageElement>('img')
  ).map(async (imgEl) => {
    try {
      const rect = imgEl.getBoundingClientRect();
      const dataUri = await fetchAsDataUri(imgEl.src);
      const imageEl = document.createElementNS(ns, 'image');
      imageEl.setAttribute('x', String(rect.left - containerRect.left));
      imageEl.setAttribute('y', String(rect.top - containerRect.top));
      imageEl.setAttribute('width', String(rect.width));
      imageEl.setAttribute('height', String(rect.height));
      imageEl.setAttribute('href', dataUri);
      imageEl.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        dataUri
      );
      root.appendChild(imageEl);
    } catch {
      // Skip icons that cannot be fetched.
    }
  });
  await Promise.all(imgPromises);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(root);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  downloadFile(blob, generateGenericFilename('vector.svg'));
};

/**
 * Export the rendered scene as a foreignObject SVG using html-to-image.
 * External images are inlined as data: URIs automatically. The output
 * is a self-contained SVG that renders in any browser and in Figma.
 * Not editable as individual vector shapes in Illustrator/Inkscape.
 */
export const exportAsUniversalSvg = async (
  el: HTMLElement,
  bgColor: string
): Promise<void> => {
  const prevBg = el.style.background;
  el.style.background = bgColor;
  try {
    const dataUrl = await toSvg(el, { cacheBust: true });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadFile(blob, generateGenericFilename('universal.svg'));
  } finally {
    el.style.background = prevBg;
  }
};
