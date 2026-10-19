// SEC-01: strip executable / embedding vectors from an SVG data URI before
// it is inlined into an exported SVG. Removed: <script>, <foreignObject>
// (which can host arbitrary HTML), on* event handlers, SMIL that can rewrite
// an attribute (<set>, <animate>, <animateTransform>), <style>, and any
// href that is not a fragment, http(s): or a data:image/ URI. The export
// places each icon as <image href="data:...">, which a browser renders in
// image mode with no script and no navigation; this pass is for the file
// itself, read by anything else. Non-SVG data URIs (png/jpeg/gif/webp)
// carry no executable surface and are returned unchanged.

const SVG_DATA_PREFIX = 'data:image/svg+xml';

const REMOVED_ELEMENTS = [
  'script',
  'foreignObject',
  'set',
  'animate',
  'animateTransform',
  'style'
];

const isSafeHref = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith('#') ||
    v.startsWith('http:') ||
    v.startsWith('https:') ||
    v.startsWith('data:image/')
  );
};

const base64ToUtf8 = (b64: string): string => {
  const bytes = Uint8Array.from(atob(b64), (c) => {
    return c.charCodeAt(0);
  });
  return new TextDecoder().decode(bytes);
};

const utf8ToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

// Decode the SVG markup out of a `data:image/svg+xml[;base64],…` URI.
// Returns null if the payload can't be decoded.
const decodeSvgPayload = (dataUri: string): string | null => {
  const comma = dataUri.indexOf(',');
  if (comma === -1) return null;
  const meta = dataUri.slice(0, comma);
  const payload = dataUri.slice(comma + 1);
  try {
    return /;base64/i.test(meta)
      ? base64ToUtf8(payload)
      : decodeURIComponent(payload);
  } catch {
    return null;
  }
};

export const sanitizeSvgDataUri = (dataUri: string): string => {
  if (!dataUri.toLowerCase().startsWith(SVG_DATA_PREFIX)) return dataUri;

  const svgText = decodeSvgPayload(dataUri);
  if (svgText === null) return dataUri;

  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  // If the SVG didn't parse cleanly, don't try to re-serialise it — leave
  // the original URI (the export simply embeds opaque, non-executing data).
  if (doc.getElementsByTagName('parsererror').length > 0) return dataUri;

  // By local name, so a prefixed or differently cased tag is caught too.
  Array.from(doc.getElementsByTagName('*')).forEach((el) => {
    if (
      REMOVED_ELEMENTS.some((name) => {
        return name.toLowerCase() === el.localName.toLowerCase();
      })
    ) {
      el.remove();
    }
  });
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
      } else if (attr.localName === 'href' && !isSafeHref(attr.value)) {
        el.removeAttributeNode(attr);
      }
    });
  });

  const serialized = new XMLSerializer().serializeToString(doc.documentElement);
  return `data:image/svg+xml;base64,${utf8ToBase64(serialized)}`;
};
