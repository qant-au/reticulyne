import { produce } from 'immer';
import { ModelItem } from 'src/types';
import { getItemByIdOrThrow } from 'src/utils';
import { State } from './types';

export const updateModelItem = (
  id: string,
  updates: Partial<ModelItem>,
  state: State
): State => {
  const modelItem = getItemByIdOrThrow(state.model.items, id);

  const newState = produce(state, (draft) => {
    draft.model.items[modelItem.index] = { ...modelItem.value, ...updates };
  });

  return newState;
};

export const createModelItem = (
  newModelItem: ModelItem,
  state: State
): State => {
  const newState = produce(state, (draft) => {
    draft.model.items.push(newModelItem);
  });

  return updateModelItem(newModelItem.id, newModelItem, newState);
};

export const deleteModelItem = (id: string, state: State): State => {
  const modelItem = getItemByIdOrThrow(state.model.items, id);

  const newState = produce(state, (draft) => {
    // splice — not `delete arr[i]`. `delete` leaves a sparse-array
    // hole (an `undefined` slot that the array's length still
    // counts), which breaks every caller that iterates naively
    // (`.some(i => i.id === x)` → TypeError on the hole) and
    // round-trips as `null` through JSON.stringify. The sibling
    // reducers in view.ts / connector.ts / rectangle.ts / textBox.ts
    // all use splice — this one was an outlier before BUG4-02.
    draft.model.items.splice(modelItem.index, 1);
  });

  return newState;
};
