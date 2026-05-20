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

export const id = z.string();
export const color = z.string();

export const constrainedStrings = {
  name: z.string().max(100),
  description: z.string().max(1000)
};
