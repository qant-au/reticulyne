import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { Size, Coords, View, ItemReference } from 'src/types';
import {
  getUnprojectedBounds as getUnprojectedBoundsUtil,
  getFitToViewParams as getFitToViewParamsUtil,
  CoordsUtils
} from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { useResizeObserver } from './useResizeObserver';

export const useDiagramUtils = () => {
  const scene = useScene();
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const { size: rendererSize } = useResizeObserver(rendererEl);
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const getUnprojectedBounds = useCallback((): Size & Coords => {
    return getUnprojectedBoundsUtil(scene.currentView);
  }, [scene.currentView]);

  const getFitToViewParams = useCallback(
    (viewportSize: Size) => {
      return getFitToViewParamsUtil(scene.currentView, viewportSize);
    },
    [scene.currentView]
  );

  const fitToView = useCallback(async () => {
    const { zoom, scroll } = getFitToViewParams(rendererSize);

    uiStateActions.setScroll({
      position: scroll,
      offset: CoordsUtils.zero()
    });
    uiStateActions.setZoom(zoom);
  }, [uiStateActions, getFitToViewParams, rendererSize]);

  // UXA-07 (unlocked by 1.4): frame just the selected items. Reuses the
  // same bounds maths as fitToView by handing it a view filtered down to
  // the selection, rather than duplicating the projection logic.
  //
  // No-ops on an empty selection: `getProjectBounds` falls back to a
  // zero-size box at the origin when handed nothing, which would fling the
  // viewport to a corner of an otherwise fine diagram.
  const fitToSelection = useCallback(
    async (selection: ItemReference[]) => {
      if (selection.length === 0) return;

      const idsOfType = (type: ItemReference['type']) => {
        return new Set(
          selection
            .filter((s) => {
              return s.type === type;
            })
            .map((s) => {
              return s.id;
            })
        );
      };

      const itemIds = idsOfType('ITEM');
      const connectorIds = idsOfType('CONNECTOR');
      const rectangleIds = idsOfType('RECTANGLE');
      const textBoxIds = idsOfType('TEXTBOX');

      const view: View = {
        ...scene.currentView,
        items: (scene.currentView.items ?? []).filter((i) => {
          return itemIds.has(i.id);
        }),
        connectors: (scene.currentView.connectors ?? []).filter((c) => {
          return connectorIds.has(c.id);
        }),
        rectangles: (scene.currentView.rectangles ?? []).filter((r) => {
          return rectangleIds.has(r.id);
        }),
        textBoxes: (scene.currentView.textBoxes ?? []).filter((t) => {
          return textBoxIds.has(t.id);
        })
      };

      const { zoom, scroll } = getFitToViewParamsUtil(view, rendererSize);

      uiStateActions.setScroll({
        position: scroll,
        offset: CoordsUtils.zero()
      });
      uiStateActions.setZoom(zoom);
    },
    [uiStateActions, scene.currentView, rendererSize]
  );

  return {
    getUnprojectedBounds,
    fitToView,
    fitToSelection,
    getFitToViewParams
  };
};
