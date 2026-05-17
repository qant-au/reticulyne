// Factory for a Zustand-backed React context store.
//
// The three editor stores (modelStore, sceneStore, uiStateStore) all
// share the same scaffolding: a React Context, a per-Provider Zustand
// store built once via `useState(factory)`, and a `useStore(store,
// selector)` hook that throws a "Missing provider" error when called
// outside the Provider's subtree. Pre-QUA4-08, that scaffolding was
// copy-pasted across three files (~120 lines of duplicated wiring).
//
// This factory replaces the duplication. Each store file shrinks to:
//   * a state-shape type / factory
//   * a one-line `createContextualStore<MyStore>(factoryFn)`
//   * exporting the Provider + hook returned by the factory.

import React, { createContext, useContext, useState } from 'react';
import { type StoreApi, useStore as zustandUseStore } from 'zustand';

interface ContextualStore<T> {
  Provider: React.FC<{ children: React.ReactNode }>;
  useStore: <R>(selector: (state: T) => R) => R;
}

export const createContextualStore = <T,>(
  initialFactory: () => StoreApi<T>,
  displayName: string
): ContextualStore<T> => {
  const Context = createContext<StoreApi<T> | null>(null);
  Context.displayName = `${displayName}Context`;

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [store] = useState(initialFactory);
    return <Context.Provider value={store}>{children}</Context.Provider>;
  };
  Provider.displayName = `${displayName}Provider`;

  function useStore<R>(selector: (state: T) => R): R {
    const store = useContext(Context);
    if (store === null) {
      throw new Error(
        `Missing ${displayName} provider in the tree. Wrap your component in <${displayName}Provider>.`
      );
    }
    return zustandUseStore(store, selector);
  }

  return { Provider, useStore };
};
