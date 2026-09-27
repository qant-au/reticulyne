// This file will be exported as it's own bundle (separate to the main bundle).  This is because the main
// bundle requires `window` to be present and so can't be imported into a Node environment.
export const version = PACKAGE_VERSION;
export * as reducers from 'src/stores/reducers';
export { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
export * from 'src/schemas';
export type { ReticulyneProps, InitialData } from 'src/types';
export type * from 'src/types/model';
export type * from 'src/types/imperative';

// FEA-05: the const option-maps behind the string-union props, as
// runtime values, so a host can write `EditorModeEnum.EDITABLE` rather
// than a bare string. Pure `as const` objects with type-only imports, so
// this subpath stays safe to load without `window`.
export {
  EditorModeEnum,
  MainMenuOptionsEnum,
  ProjectionOrientationEnum
} from 'src/types/common';
export type { MainMenuOptions } from 'src/types/common';
export {
  AnchorPositionOptions,
  DialogTypeEnum,
  LayerOrderingActionOptions
} from 'src/types/ui';
export type { AnchorPosition, LayerOrderingAction } from 'src/types/ui';
export { tileOriginOptions, ItemReferenceTypeOptions } from 'src/types/scene';
export type { TileOrigin, ItemReferenceType } from 'src/types/scene';
