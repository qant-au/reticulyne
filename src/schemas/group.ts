import { z } from 'zod';
import { id, constrainedStrings, hexColor } from './common';

// a group of nodes, rectangles and text boxes on one view.
// Membership lives on the member (`parentGroupId`), not as a list on the
// group, so "the members of G" is a filter and two people editing the
// same diagram never race on one array. Groups nest through the same
// field; a cycle is rejected by validateView.
export const groupSchema = z
  .object({
    id,
    name: constrainedStrings.name.optional(),
    /** A faint backing fill behind the members. */
    color: hexColor.optional(),
    parentGroupId: id.optional(),
    /** drawn as one box in place of its members. */
    collapsed: z.boolean().optional()
  })
  .strict();
