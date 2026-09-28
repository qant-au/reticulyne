import {
  getItemByIdOrThrow,
  getBoundingBox,
  convertBoundsToNamedAnchors,
  cornerTileAtPointer,
  CoordsUtils
} from 'src/utils';
import { ModeActions, AnchorPosition } from 'src/types';

export const TransformRectangle: ModeActions = {
  entry: () => {},
  exit: () => {},
  mousemove: ({ uiState, scene, rendererSize }) => {
    if (uiState.mode.type !== 'RECTANGLE.TRANSFORM') return;

    const anchor = uiState.mode.selectedAnchor;
    if (!anchor) return;

    const rectangle = getItemByIdOrThrow(
      scene.rectangles,
      uiState.mode.id
    ).value;
    const namedBounds = convertBoundsToNamedAnchors(
      getBoundingBox([rectangle.to, rectangle.from])
    );
    const opposite: Record<AnchorPosition, AnchorPosition> = {
      BOTTOM_LEFT: 'TOP_RIGHT',
      TOP_RIGHT: 'BOTTOM_LEFT',
      BOTTOM_RIGHT: 'TOP_LEFT',
      TOP_LEFT: 'BOTTOM_RIGHT'
    };
    // Which side of the rectangle the dragged corner is on decides how
    // the pointer snaps (see cornerTileAtPointer).
    const corner = cornerTileAtPointer(
      {
        mouse: uiState.mouse.position.screen,
        zoom: uiState.zoom,
        scroll: uiState.scroll,
        rendererSize
      },
      anchor === 'BOTTOM_RIGHT' || anchor === 'TOP_RIGHT',
      anchor === 'TOP_RIGHT' || anchor === 'TOP_LEFT'
    );
    if (CoordsUtils.isEqual(corner, namedBounds[anchor])) return;

    const next = getBoundingBox([namedBounds[opposite[anchor]], corner]);
    const [from, to] =
      anchor === 'BOTTOM_LEFT' || anchor === 'TOP_RIGHT'
        ? [next[2], next[0]]
        : [next[3], next[1]];
    scene.updateRectangle(uiState.mode.id, { from, to });
  },
  mousedown: () => {
    // MOUSE_DOWN is triggered by the anchor iteself (see `TransformAnchor.tsx`)
  },
  mouseup: ({ uiState }) => {
    if (uiState.mode.type !== 'RECTANGLE.TRANSFORM') return;

    uiState.actions.setMode({
      type: 'CURSOR',
      mousedownItem: null,
      showCursor: true
    });
  }
};
