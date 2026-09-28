import { z } from 'zod';
import type { DiagramPatch } from 'src/types';
import { modelItemSchema } from 'src/schemas/modelItems';
import { viewItemSchema } from 'src/schemas/views';
import { connectorSchema } from 'src/schemas/connector';
import { rectangleSchema } from 'src/schemas/rectangle';
import { textBoxSchema } from 'src/schemas/textBox';
import { groupSchema } from 'src/schemas/group';
import { updateModelItem } from './modelItem';
import { view as viewReducer } from './view';
import type { State } from './types';

// ROADMAP 1.5: a host's live update, as a set of per-id changes. Validated
// against the same schemas a loaded model is, restricted to the fields a
// patch may touch, so a patch cannot add, remove or re-anchor anything.
const byId = <T extends z.ZodTypeAny>(schema: T) => {
  return z.record(z.string(), schema).optional();
};

export const diagramPatchSchema = z
  .object({
    items: byId(
      modelItemSchema
        .pick({ name: true, description: true, icon: true })
        .extend({ tile: viewItemSchema.shape.tile })
        .partial()
        .strict()
    ),
    connectors: byId(
      connectorSchema
        .pick({
          description: true,
          color: true,
          width: true,
          style: true,
          direction: true,
          glyph: true,
          animated: true,
          animationRate: true,
          animationFlow: true
        })
        .partial()
        .strict()
    ),
    rectangles: byId(
      rectangleSchema
        .pick({
          color: true,
          colorValue: true,
          outlineColor: true,
          transparency: true
        })
        .partial()
        .strict()
    ),
    textBoxes: byId(
      textBoxSchema.pick({ content: true, fontSize: true }).partial().strict()
    ),
    groups: byId(
      groupSchema.pick({ name: true, color: true }).partial().strict()
    )
  })
  .strict();

// Runs every change through the reducer the UI uses for the same edit, so
// a patched connector re-routes and a moved node drags its connectors
// along exactly as a drag would. Ids that are not there are skipped: by the
// time a poll result arrives the user may have deleted the thing it names.
export const applyDiagramPatch = (
  patch: DiagramPatch,
  viewId: string,
  state: State
): State => {
  let next = state;
  const view = state.model.views.find((v) => {
    return v.id === viewId;
  });
  const inView = (list: { id: string }[] | undefined, id: string) => {
    return (list ?? []).some((x) => {
      return x.id === id;
    });
  };

  for (const [id, { tile, ...fields }] of Object.entries(patch.items ?? {})) {
    if (Object.keys(fields).length > 0 && inView(next.model.items, id)) {
      next = updateModelItem(id, fields, next);
    }
    if (tile && view && inView(view.items, id)) {
      next = viewReducer({
        action: 'UPDATE_VIEWITEM',
        payload: { id, tile },
        ctx: { viewId, state: next }
      });
    }
  }
  if (!view) return next;

  for (const [id, fields] of Object.entries(patch.connectors ?? {})) {
    if (!inView(view.connectors, id)) continue;
    next = viewReducer({
      action: 'UPDATE_CONNECTOR',
      payload: { id, ...fields },
      ctx: { viewId, state: next }
    });
  }
  for (const [id, fields] of Object.entries(patch.rectangles ?? {})) {
    if (!inView(view.rectangles, id)) continue;
    next = viewReducer({
      action: 'UPDATE_RECTANGLE',
      payload: { id, ...fields },
      ctx: { viewId, state: next }
    });
  }
  for (const [id, fields] of Object.entries(patch.textBoxes ?? {})) {
    if (!inView(view.textBoxes, id)) continue;
    next = viewReducer({
      action: 'UPDATE_TEXTBOX',
      payload: { id, ...fields },
      ctx: { viewId, state: next }
    });
  }
  for (const [id, fields] of Object.entries(patch.groups ?? {})) {
    if (!inView(view.groups, id)) continue;
    next = viewReducer({
      action: 'UPDATE_GROUP',
      payload: { id, ...fields },
      ctx: { viewId, state: next }
    });
  }
  return next;
};
