import { ModelStore, UiStateStore, Size } from 'src/types';
import { useScene } from 'src/hooks/useScene';

// 1.4: modifier keys held at the moment the pointer event fired. Mode
// handlers are pure functions of `State` and never see the raw event, so
// Shift-to-extend-selection needs the flag threaded through here.
export interface Modifiers {
  shift: boolean;
  ctrlOrMeta: boolean;
}

export interface State {
  model: ModelStore;
  scene: ReturnType<typeof useScene>;
  uiState: UiStateStore;
  rendererRef: HTMLElement;
  rendererSize: Size;
  isRendererInteraction: boolean;
  modifiers: Modifiers;
}

export type ModeActionsAction = (state: State) => void;

export type ModeActions = {
  entry?: ModeActionsAction;
  exit?: ModeActionsAction;
  mousemove?: ModeActionsAction;
  mousedown?: ModeActionsAction;
  mouseup?: ModeActionsAction;
};
