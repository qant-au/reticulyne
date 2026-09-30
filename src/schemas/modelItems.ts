import { z } from 'zod';
import { sceneObjectSchema } from 'src/vendor/accurona-core/scene/schema';
import { id, constrainedStrings, SCHEMA_LIMITS } from './common';

// lw-082: an object's element, props, ports and links ride on its model
// item, so an item placed from the catalogue keeps what makes it that
// device (its ports, its catalogue link, its Accurona twin) through a save.
// They take the scene format's own shapes. lw-084: props and ports are
// edited as tables in the inspector (PropsPortsSection); element and links
// are not edited.
export const modelItemSchema = z
  .object({
    id,
    name: constrainedStrings.name,
    description: constrainedStrings.description.optional(),
    icon: id.optional(),
    element: sceneObjectSchema.shape.element,
    props: sceneObjectSchema.shape.props,
    ports: sceneObjectSchema.shape.ports,
    links: sceneObjectSchema.shape.links
  })
  .strict();

export const modelItemsSchema = z
  .array(modelItemSchema)
  .max(SCHEMA_LIMITS.ITEMS);
