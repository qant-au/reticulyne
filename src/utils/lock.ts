import type { ItemReference, View } from 'src/types';

// A locked item is drawn but cannot be selected on the canvas, so
// it cannot be moved, edited or deleted until it is unlocked.

const listFor = (view: View, type: ItemReference['type']) => {
  switch (type) {
    case 'ITEM':
      return view.items;
    case 'CONNECTOR':
      return view.connectors;
    case 'RECTANGLE':
      return view.rectangles;
    case 'TEXTBOX':
      return view.textBoxes;
    default:
      return undefined;
  }
};

export const isLocked = (view: View, ref: ItemReference): boolean => {
  const entry = listFor(view, ref.type)?.find((e) => {
    return e.id === ref.id;
  });
  return entry?.locked === true;
};

export const hasLocked = (view: View): boolean => {
  return [
    ...view.items,
    ...(view.connectors ?? []),
    ...(view.rectangles ?? []),
    ...(view.textBoxes ?? [])
  ].some((e) => {
    return e.locked === true;
  });
};
