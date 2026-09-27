import type { State } from 'src/stores/reducers/types';
import type { View, SceneStore } from 'src/types';
import type { HistoryStore } from 'src/stores/historyStore';

// QUA-13: what useScene hands each domain hook. The domain hooks open no
// store subscriptions of their own for these, so splitting the file
// changed no render behaviour: every subscription still lives in
// useScene, exactly as before.
export interface SceneCore {
  getState: () => State;
  setState: (newState: State) => void;
  currentViewId: string;
  currentView: View;
  historyActions: HistoryStore['actions'];
  sceneActions: SceneStore['actions'];
}
