import { createStore } from 'zustand';
import { ModelStore } from 'src/types';
import { INITIAL_DATA } from 'src/config';
import { createContextualStore } from './createContextualStore';

const { Provider, useStore } = createContextualStore<ModelStore>(() => {
  return createStore<ModelStore>((set, get) => {
    return {
      ...INITIAL_DATA,
      actions: {
        get,
        set
      }
    };
  });
}, 'Model');

export const ModelProvider = Provider;
export const useModelStore = useStore;
