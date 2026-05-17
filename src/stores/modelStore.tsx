import React, { createContext, useContext, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { ModelStore } from 'src/types';
import { INITIAL_DATA } from 'src/config';

const initialState = () => {
  return createStore<ModelStore>((set, get) => {
    return {
      ...INITIAL_DATA,
      actions: {
        get,
        set
      }
    };
  });
};

const ModelContext = createContext<ReturnType<typeof initialState> | null>(
  null
);

interface ProviderProps {
  children: React.ReactNode;
}

export const ModelProvider = ({ children }: ProviderProps) => {
  const [store] = useState(initialState);

  return (
    <ModelContext.Provider value={store}>{children}</ModelContext.Provider>
  );
};

export function useModelStore<T>(selector: (state: ModelStore) => T) {
  const store = useContext(ModelContext);

  if (store === null) {
    throw new Error('Missing provider in the tree');
  }

  return useStore(store, selector);
}
