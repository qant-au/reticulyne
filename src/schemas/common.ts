import { z } from 'zod';

// Bound tile coordinates to keep the pathfinder's grid allocation
// finite. PF.Grid(width, height) allocates width*height nodes; an
// unbounded `coords` schema let a crafted initialData connector with
// anchors at e.g. {x:0,y:0} and {x:1e7,y:1e7} trigger a ~10^14-cell
// allocation on the embedder's main thread (instant OOM).
//
// ±1000 is far beyond any realistic diagram: a 2000x2000 worst-case
// search-area grid is ~4M cells (~160 MB). Real fixtures sit in the
// single-digit tile range. Integers match how the pathfinder library
// indexes its grid; floats produce undefined-behaviour reads.
export const TILE_COORD_MAX = 1000;

const tileCoord = z.number().int().gte(-TILE_COORD_MAX).lte(TILE_COORD_MAX);

export const coords = z
  .object({
    x: tileCoord,
    y: tileCoord
  })
  .strict();

// Defence-in-depth array caps applied across the schemas (SEC5-02).
// Per-array choice rationale:
//   - VIEWS:        bigger than any realistic multi-view diagram, small
//                   enough that the cross-ref O(n*m) joins in
//                   validation.ts stay milliseconds-scale.
//   - ITEMS / VIEW_ITEMS: a 5k-node diagram is already at the upper
//                   bound of legibility; doubling that gives headroom.
//   - CONNECTORS / RECTANGLES / TEXT_BOXES: scales with items; matches.
//   - ICONS:        a custom palette of a few hundred plus the bundled
//                   isopacks (AWS alone is ~1.5k icons) tops out below
//                   5k in practice.
//   - COLORS:       the colour picker UI breaks down well before 100.
//   - ANCHORS:      a single connector with hundreds of waypoints is
//                   already a UX failure; 100 is generous.
export const SCHEMA_LIMITS = {
  VIEWS: 1_000,
  ITEMS: 10_000,
  VIEW_ITEMS: 10_000,
  CONNECTORS: 5_000,
  RECTANGLES: 5_000,
  TEXT_BOXES: 5_000,
  ICONS: 5_000,
  COLORS: 100,
  ANCHORS: 100,
  // Sized for `data:image/svg+xml;base64,...` URLs of moderately
  // complex SVG illustrations. The bundled isoflow isopack ships
  // 16 icons whose base64 payloads exceed 8 KB (the largest is
  // ~32 KB), so 8 KB was too tight and rejected real data —
  // 65 KB gives ~2× headroom over the current upper bound.
  ICON_URL_MAX: 65_536
};

export const id = z.string();
export const color = z.string();

export const constrainedStrings = {
  name: z.string().max(100),
  description: z.string().max(1000)
};

// SEC-01 icon-URL scheme allowlist. Icon urls feed both <img src> (where
// the browser blocks script execution) AND exportAsVectorSvg's
// fetchAsDataUri inlining — and an inlined SVG opened from a `file:`
// origin executes embedded handlers. Unlike <a href> links (see
// sanitizeLinkUrl.ts) icons legitimately use data: and blob:, but only
// *image* data: (never data:text/html), and never javascript:/file:/etc.
// Relative URLs (no scheme) are allowed for host-served icon assets.
const ALLOWED_ICON_DATA_SUBTYPES = ['png', 'jpeg', 'gif', 'webp', 'svg+xml'];

export const isAllowedIconUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return true; // empty is a no-op, not a scheme risk

  const lowered = trimmed.toLowerCase();
  // Reject percent-encoded scheme smuggling up front (e.g. javascript%3a).
  if (lowered.startsWith('javascript%3a')) return false;

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return true; // no scheme → relative URL

  const scheme = lowered.slice(0, colonIdx);
  // A ':' that is not in a valid scheme position (e.g. inside a relative
  // path) means this is not a scheme-bearing URL → treat as relative.
  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme)) return true;

  if (scheme === 'https' || scheme === 'http' || scheme === 'blob') return true;
  if (scheme === 'data') {
    const mime = /^data:([^;,]+)/i.exec(trimmed)?.[1]?.toLowerCase() ?? '';
    return (
      mime.startsWith('image/') &&
      ALLOWED_ICON_DATA_SUBTYPES.includes(mime.slice('image/'.length))
    );
  }
  return false;
};

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, {
  message: 'Must be a 6-digit hex colour (e.g. #ff0000)'
});
