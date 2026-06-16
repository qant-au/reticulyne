// QUA-03: the UI-state runtime shapes (`UiState`, `UiStateActions`,
// `UiStateStore`, `Mouse`, `Scroll`, the `Mode` variants, `ItemControls`,
// `ContextMenu`, `IconCollectionState`, `ClipboardEntry`, …) moved to
// `./internal` so the zustand-store types stay off the published public
// surface. What remains here are the const option-maps and their derived
// union types, which are safe (and intended) to expose — see FEA-05.

export const AnchorPositionOptions = {
  BOTTOM_LEFT: 'BOTTOM_LEFT',
  BOTTOM_RIGHT: 'BOTTOM_RIGHT',
  TOP_RIGHT: 'TOP_RIGHT',
  TOP_LEFT: 'TOP_LEFT'
} as const;

export type AnchorPosition = keyof typeof AnchorPositionOptions;

export const DialogTypeEnum = {
  EXPORT_IMAGE: 'EXPORT_IMAGE',
  EXPORT_SVG: 'EXPORT_SVG',
  KEYBOARD_SHORTCUTS: 'KEYBOARD_SHORTCUTS'
} as const;

export const LayerOrderingActionOptions = {
  BRING_TO_FRONT: 'BRING_TO_FRONT',
  SEND_TO_BACK: 'SEND_TO_BACK',
  BRING_FORWARD: 'BRING_FORWARD',
  SEND_BACKWARD: 'SEND_BACKWARD'
} as const;

export type LayerOrderingAction = keyof typeof LayerOrderingActionOptions;
