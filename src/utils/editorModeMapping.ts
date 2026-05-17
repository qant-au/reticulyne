// Mapping from `editorMode` to the set of overlay tools that should be
// visible in that mode. Lives in `src/utils` (rather than co-located
// with the UiOverlay) so any future component can reference the same
// allowlist without prop-drilling.
//
// Extracted from src/components/UiOverlay/UiOverlay.tsx under QUA4-10.

import { EditorModeEnum } from 'src/types';

export type ToolName =
  | 'MAIN_MENU'
  | 'ZOOM_CONTROLS'
  | 'TOOL_MENU'
  | 'ITEM_CONTROLS'
  | 'VIEW_TITLE';

export interface EditorModeMapping {
  [k: string]: ToolName[];
}

export const EDITOR_MODE_MAPPING: EditorModeMapping = {
  [EditorModeEnum.EDITABLE]: [
    'ITEM_CONTROLS',
    'ZOOM_CONTROLS',
    'TOOL_MENU',
    'MAIN_MENU',
    'VIEW_TITLE'
  ],
  [EditorModeEnum.EXPLORABLE_READONLY]: ['ZOOM_CONTROLS', 'VIEW_TITLE'],
  [EditorModeEnum.NON_INTERACTIVE]: []
};

export const getEditorModeMapping = (
  editorMode: keyof typeof EditorModeEnum
): ToolName[] => {
  return EDITOR_MODE_MAPPING[editorMode];
};
