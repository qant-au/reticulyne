import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Size } from '../types';
import { sanitizeSvgDataUri } from './sanitizeSvgDataUri';
import { isAllowedIconUrl } from '../schemas/common';
import { serializeScene, type Scene } from '../vendor/accurona-core';

export const generateGenericFilename = (extension: string) => {
  return `reticulyne-export-${new Date().toISOString()}.${extension}`;
};

// 1.2: name an export after the diagram. Only characters that are illegal
// in file names (or control characters) are replaced, so a title in any
// script survives. 'Untitled', or a title with nothing usable left, falls
// back to the generic timestamped name.
export const filenameForTitle = (
  title: string | undefined,
  extension: string
) => {
  const safe = (title ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 100);
  if (!safe || title === 'Untitled') return generateGenericFilename(extension);
  return `${safe}.${extension}`;
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

// Replaces file-saver (DEP-01): every browser this package supports
// honours <a download> on a blob: URL. The URL is revoked on a delay, not
// synchronously, because revoking before the browser has started reading
// it can cancel the download (Safari); 40s is file-saver's own figure.
export const DOWNLOAD_REVOKE_DELAY_MS = 40_000;

export const downloadFile = (data: Blob, filename: string) => {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, DOWNLOAD_REVOKE_DELAY_MS);
};

// The diagram's file: a scene, the file format. serializeScene validates
// it and throws on an invalid one rather than writing a file that would
// not open again.
export const exportAsJSON = (scene: Scene) => {
  const data = new Blob([serializeScene(scene)], {
    type: 'application/json;charset=utf-8'
  });

  downloadFile(data, filenameForTitle(scene.title ?? 'Untitled', 'json'));
};

export const IMAGE_READY_TIMEOUT_MS = 10_000;

// Every <img> under `el` loaded and decoded, or an Error saying which did
// not. Node icons are loading="lazy", and a lazy image the browser does
// not see (the export dialog renders its editor off screen, and the PDF
// captures icons scrolled out of view) never loads: the capture drew the
// labels with no icons (sweep 2026-09-30, A14). An export never drops an
// icon silently.
export const waitForImages = async (
  el: HTMLElement,
  timeoutMs = IMAGE_READY_TIMEOUT_MS
) => {
  const images = [...el.querySelectorAll('img')].filter((img) => {
    return !!img.getAttribute('src');
  });
  const failed: string[] = [];

  await Promise.all(
    images.map(async (img) => {
      img.setAttribute('loading', 'eager');
      if (typeof img.decode !== 'function') return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          img.decode(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('timed out'));
            }, timeoutMs);
          })
        ]);
      } catch {
        failed.push(img.src.slice(0, 80));
      } finally {
        clearTimeout(timer);
      }
    })
  );

  if (failed.length > 0) {
    throw new Error(
      `${failed.length} image(s) did not load for the export: ${failed.join(', ')}`
    );
  }
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

  await waitForImages(el);

  const failed: string[] = [];
  const imageData = await toPng(el, {
    ...size,
    cacheBust: true,
    // html-to-image rejects a capture with an image that will not load by
    // throwing the image's bare DOM error Event, which says nothing (sweep
    // 2026-09-30, Export as PDF). Note it here and fail below with a real
    // Error instead.
    onImageErrorHandler: (event) => {
      const target = typeof event === 'string' ? null : event?.target;
      failed.push(
        target instanceof HTMLImageElement ? target.src.slice(0, 80) : 'image'
      );
    }
  });

  if (failed.length > 0) {
    throw new Error(
      `${failed.length} image(s) could not be drawn into the export: ${failed.join(', ')}`
    );
  }

  return imageData;
};

/**
 * Render the current canvas to a PNG (via the existing exportAsImage
 * path) and embed it in a single-page PDF that gets downloaded
 * client-side. Used by the MainMenu's "Export as PDF" entry.
 *
 * Client-side only: this never makes a network call. The PDF is built
 * in-browser by jsPDF and saved via downloadFile(). The page orientation
 * (portrait vs landscape) follows the rendered image's aspect ratio
 * so the diagram fills the page in whichever orientation matches it
 * better. Page size is fixed to A4; the image is scaled to fit the
 * page while preserving aspect ratio, with a small uniform margin.
 *
 * Added under FEA4-04 of the fourth-pass review.
 */
// Every export is named after the diagram, as the JSON one already was;
// the image, PDF and SVG exports used a timestamp.
export const exportAsPdf = async (
  el: HTMLDivElement,
  size?: Size,
  title?: string
) => {
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
  downloadFile(blob, filenameForTitle(title, 'pdf'));
};

/**
 * Convert an <img> src to a base64 data URI. Returns the src unchanged
 * if it is already a data URI. SVG payloads are sanitised (SEC-01) before
 * being handed back for inlining so an exported SVG can't carry embedded
 * <script>/<foreignObject>/on* handlers.
 *
 * SEC-11: validate the scheme before fetch(). Icon urls can originate from
 * untrusted initialData; without this guard an embedder running a permissive
 * connect-src could be coerced into fetching file:/javascript:/cross-origin
 * targets (a "browser-as-port-scanner" primitive). We reuse the SEC-01 icon
 * allowlist (http(s)/blob/relative path/image-only data:) so the export path
 * enforces the same scheme policy as the schema entry point.
 */
const fetchAsDataUri = async (src: string): Promise<string> => {
  if (src.startsWith('data:')) return sanitizeSvgDataUri(src);
  if (!isAllowedIconUrl(src)) {
    throw new Error(`Refusing to fetch icon from disallowed URL: ${src}`);
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Failed to fetch icon: ${res.status}`);
  const fetchedBlob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(sanitizeSvgDataUri(reader.result as string));
    };
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
  bgColor: string,
  title?: string
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

  // Each scene element sits in a SceneLayer: a direct child of `el`,
  // placed at 50%/50% (offsetLeft/Top) and carrying the view's scroll
  // and zoom as a CSS transform. Both must wrap the element's own
  // placement, or the shapes land at the top-left corner at the wrong
  // scale while the icons (placed by bounding box) land correctly.
  // Measured, not walked: the layer can sit several boxes below `el`
  // (inside the export dialog it is under the editor's own root). A
  // layer is 0x0 with its transform origin at 0,0, so its bounding box
  // is its origin after the scroll translate; the scale comes from the
  // computed matrix.
  const elRect = el.getBoundingClientRect();
  const layerTransform = (node: Element) => {
    const layer =
      node.parentElement?.closest<HTMLElement>('[data-scene-layer]');
    if (!layer || !el.contains(layer)) return '';
    const r = layer.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(window.getComputedStyle(layer).transform);
    return `translate(${r.left - elRect.left} ${r.top - elRect.top}) matrix(${m.a} ${m.b} ${m.c} ${m.d} 0 0)`;
  };

  // Pattern 1: <svg style="position:absolute; left:X; top:Y; transform:matrix(...)">
  el.querySelectorAll<SVGSVGElement>('svg').forEach((svgEl) => {
    if (svgEl.style.position !== 'absolute') return;
    const x = parseFloat(svgEl.style.left) || 0;
    const y = parseFloat(svgEl.style.top) || 0;
    const cssTransform = svgEl.style.transform || '';
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('animateMotion').forEach((a) => {
      a.remove();
    });
    clone.style.position = '';
    clone.style.left = '';
    clone.style.top = '';
    clone.style.transform = '';
    clone.style.transformOrigin = '';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute(
      'transform',
      `${layerTransform(svgEl)} translate(${x} ${y})${cssTransform ? ` ${cssTransform}` : ''}`
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
    clone.querySelectorAll('animateMotion').forEach((a) => {
      a.remove();
    });
    const g = document.createElementNS(ns, 'g');
    g.setAttribute(
      'transform',
      `${layerTransform(divEl)} translate(${x} ${y})${cssTransform ? ` ${cssTransform}` : ''}`
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
  downloadFile(blob, filenameForTitle(title, 'vector.svg'));
};

/**
 * Export the rendered scene as a foreignObject SVG using html-to-image.
 * External images are inlined as data: URIs automatically. The output
 * is a self-contained SVG that renders in any browser and in Figma.
 * Not editable as individual vector shapes in Illustrator/Inkscape.
 */
export const exportAsUniversalSvg = async (
  el: HTMLElement,
  bgColor: string,
  title?: string
): Promise<void> => {
  const { style } = el;
  const prevBg = style.background;
  style.background = bgColor;
  try {
    const dataUrl = await toSvg(el, { cacheBust: true });
    // Decoded here rather than with fetch(dataUrl): a page whose CSP has
    // connect-src 'self' (the Docker image's) refuses to fetch a data:
    // URL, and the export always failed with "Failed to fetch".
    const comma = dataUrl.indexOf(',');
    const blob = new Blob([decodeURIComponent(dataUrl.slice(comma + 1))], {
      type: 'image/svg+xml'
    });
    downloadFile(blob, filenameForTitle(title, 'universal.svg'));
  } finally {
    style.background = prevBg;
  }
};
