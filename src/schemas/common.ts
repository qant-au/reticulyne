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
  ICON_URL_MAX: 8_192
};

export const id = z.string();
export const color = z.string();

export const constrainedStrings = {
  name: z.string().max(100),
  description: z.string().max(1000)
};
