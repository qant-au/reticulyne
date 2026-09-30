import type { Scene } from './schema.js';
/** True when anything in the scene is on the `redacted` layer. */
export declare function hasRedacted(scene: Scene): boolean;
/**
 * The scene without its `redacted` layer, for an export that has not opted
 * in to it.
 *
 * - Placements, connectors, rectangles, text boxes and walls on the layer
 *   are removed.
 * - An object whose every placement was redacted is removed with them, and
 *   so are the connections that end on it. An object placed nowhere to
 *   begin with is kept.
 * - A connector that ends on an object no longer placed in its view, or on an anchor of a removed
 *   connector, is removed; a placement fixed into a removed wall keeps its
 *   position and loses the `attach`.
 */
export declare function redactScene(scene: Scene): Scene;
