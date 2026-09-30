// This file will be exported as it's own bundle (separate to the main bundle).  This is because the main
// bundle requires `window` to be present and so can't be imported into a Node environment.
export const version = PACKAGE_VERSION;
export * as reducers from 'src/stores/reducers';
export { INITIAL_DATA, INITIAL_SCENE_STATE } from 'src/config';
export * from 'src/schemas';
export type {
  ReticulyneProps,
  InitialData,
  IconUploadHandler
} from 'src/types';
export type * from 'src/types/model';
export type * from 'src/types/imperative';
export {
  readIconAsDataUrl,
  CUSTOM_ICON_COLLECTION,
  MAX_ICON_UPLOAD_BYTES
} from 'src/utils/iconUpload';
export { TEMPLATES, templateToInitialData } from 'src/templates';
export type { DiagramTemplate } from 'src/templates';

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

// The scene format, Reticulyne's file format (the Accurona scene format):
// its type, and validation, parsing and writing for hosts that store or
// check diagrams themselves. legacyModelToScene converts a model saved by
// an older Reticulyne. Framework-free, so safe to load without `window`.
export {
  validateScene,
  parseScene,
  serializeScene
} from 'src/vendor/accurona-core';
export type { Scene, SceneResult } from 'src/vendor/accurona-core';

// The catalogue (docs/catalogue.md): media, protocols and items with
// ports, validation, the scene object a placed item becomes, and the
// isometric drawings of the Accurona elements items cross-reference.
// Plain data and functions, so safe to load without `window`.
export {
  CATALOGUE,
  FAMILIES,
  FAMILY_NAMES,
  ACCURONA_ICON_COLLECTION,
  SCHEMATIC_ICON_COLLECTION,
  accuronaElement,
  accuronaIcons,
  catalogueItemIcon,
  catalogueItemSymbol,
  expandPorts,
  itemToSceneObject,
  schematicIconUrl,
  schematicIcons,
  validateCatalogue
} from 'src/catalogue';
export type {
  Capability,
  Catalogue,
  CatalogueIssue,
  CatalogueItem,
  CatalogueLink,
  CatalogueResult,
  ExpandedPort,
  Family,
  Medium,
  PortRole,
  PortTemplate,
  Protocol,
  Topology
} from 'src/catalogue';
export { legacyModelToScene } from 'src/scene/legacy';
