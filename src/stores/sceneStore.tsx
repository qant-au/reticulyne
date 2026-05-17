import React, { createContext, useContext, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { SceneStore } from 'src/types';

const initialState = () => {
  return createStore<SceneStore>((set, get) => {
    return {
      connectors: {},
      textBoxes: {},
      actions: {
        get,
        set
      }
    };
  });
};

const SceneContext = createContext<ReturnType<typeof initialState> | null>(
  null
);

interface ProviderProps {
  children: React.ReactNode;
}

export const SceneProvider = ({ children }: ProviderProps) => {
  const [store] = useState(initialState);

  return (
    <SceneContext.Provider value={store}>{children}</SceneContext.Provider>
  );
};

export function useSceneStore<T>(selector: (state: SceneStore) => T) {
  const store = useContext(SceneContext);

  if (store === null) {
    throw new Error('Missing provider in the tree');
  }

  return useStore(store, selector);
}
