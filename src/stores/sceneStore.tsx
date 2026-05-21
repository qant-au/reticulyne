import { createStore } from 'zustand';
import { SceneStore } from 'src/types';
import { createContextualStore } from './createContextualStore';

const { Provider, useStore } = createContextualStore<SceneStore>(() => {
  return createStore<SceneStore>((set, get) => {
    return {
      connectors: {},
      connectorOverlays: {},
      textBoxes: {},
      actions: {
        get,
        set
      }
    };
  });
}, 'Scene');

export const SceneProvider = Provider;
export const useSceneStore = useStore;
