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
//   - ICONS:        the built-in pack plus a few large third-party packs
//                   (a cloud provider's set runs to ~1.5k icons) tops out
//                   below 5k in practice.
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
  GROUPS: 5_000,
  ICONS: 5_000,
  COLORS: 100,
  ANCHORS: 100,
  // Sized for `data:image/svg+xml;base64,...` URLs of moderately
  // complex SVG illustrations. Real icon packs carry base64 payloads
  // well over 8 KB (~32 KB seen), so 8 KB was too tight and rejected
  // real data. 65 KB gives ~2× headroom over that.
  ICON_URL_MAX: 65_536
};

export const id = z.string();
export const color = z.string();

// Exported so the editor's fields stop at the same limits: a longer
// name was accepted, saved, and then refused on every load.
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 1000;

export const constrainedStrings = {
  name: z.string().max(NAME_MAX),
  description: z.string().max(DESCRIPTION_MAX)
};

// SEC-01 icon-URL scheme allowlist. Icon urls feed both <img src> (where
// the browser blocks script execution) AND exportAsVectorSvg's
// fetchAsDataUri inlining — and an inlined SVG opened from a `file:`
// origin executes embedded handlers. Unlike <a href> links (see
// sanitizeLinkUrl.ts) icons legitimately use data: and blob:, but only
// *image* data: (never data:text/html), and never javascript:/file:/etc.
// Relative URLs (no scheme) are allowed for host-served icon assets.
// One rule for the whole editor: the scene format's, which also refuses any
// percent-encoded scheme (not only javascript%3a).
export { isAllowedIconUrl } from 'src/core/scene/schema';

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, {
  message: 'Must be a 6-digit hex colour (e.g. #ff0000)'
});
