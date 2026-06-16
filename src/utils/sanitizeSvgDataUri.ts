// SEC-01: strip executable / embedding vectors from an SVG data URI before
// it is inlined into an exported SVG. An exported SVG opened directly from
// disk (file: origin) will execute embedded <script>, <foreignObject>
// (which can host arbitrary HTML), and on* event handlers — so they are
// removed here. Non-SVG data URIs (png/jpeg/gif/webp) carry no executable
// surface and are returned unchanged.

const SVG_DATA_PREFIX = 'data:image/svg+xml';

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

  doc.querySelectorAll('script, foreignObject').forEach((el) => {
    el.remove();
  });
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });

  const serialized = new XMLSerializer().serializeToString(doc.documentElement);
  return `data:image/svg+xml;base64,${utf8ToBase64(serialized)}`;
};
