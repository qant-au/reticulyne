import { useCallback, useEffect, useRef } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { ModeActions, State, SlimMouseEvent } from 'src/types';
import { getMouse, getItemAtTile } from 'src/utils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { useScene } from 'src/hooks/useScene';
import { Cursor } from './modes/Cursor';
import { DragItems } from './modes/DragItems';
import { DrawRectangle } from './modes/Rectangle/DrawRectangle';
import { TransformRectangle } from './modes/Rectangle/TransformRectangle';
import { Connector } from './modes/Connector';
import { Pan } from './modes/Pan';
import { PlaceIcon } from './modes/PlaceIcon';
import { TextBox } from './modes/TextBox';
import { interpretWheelEvent } from './wheelInput';

const modes: { [k in string]: ModeActions } = {
  CURSOR: Cursor,
  DRAG_ITEMS: DragItems,
  // TODO: Adopt this notation for all modes (i.e. {node.type}.{action})
  'RECTANGLE.DRAW': DrawRectangle,
  'RECTANGLE.TRANSFORM': TransformRectangle,
  CONNECTOR: Connector,
  PAN: Pan,
  PLACE_ICON: PlaceIcon,
  TEXTBOX: TextBox
};

const getModeFunction = (mode: ModeActions, e: SlimMouseEvent) => {
  switch (e.type) {
    case 'pointermove':
      return mode.mousemove;
    case 'pointerdown':
      return mode.mousedown;
    case 'pointerup':
      return mode.mouseup;
    default:
      return null;
  }
};

export const useInteractionManager = (enableGlobalDragHandlers = true) => {
  const rendererRef = useRef<HTMLElement | null>(null);
  const reducerTypeRef = useRef<string | undefined>(undefined);
  // PRF-01: narrow selectors for values that drive deps. Live state
  // needed inside handlers is read from refs at fire time so the
  // useCallback identities stay stable across mutations and the window
  // listeners only re-bind on genuine effect-dep changes.
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const modeType = useUiStateStore((state) => {
    return state.mode.type;
  });
  const rendererEl = useUiStateStore((state) => {
    return state.rendererEl;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const uiState = useUiStateStore((state) => {
    return state;
  });
  const model = useModelStore((state) => {
    return state;
  });
  const scene = useScene();
  const uiStateRef = useRef(uiState);
  const modelRef = useRef(model);
  const sceneRef = useRef(scene);
  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);
  const { size: rendererSize } = useResizeObserver(rendererEl);

  const onMouseEvent = useCallback(
    (e: MouseEvent) => {
      if (!rendererRef.current) return;

      const liveUiState = uiStateRef.current;
      const mode = modes[liveUiState.mode.type];
      const modeFunction = getModeFunction(mode, e);

      if (!modeFunction) return;

      const nextMouse = getMouse({
        interactiveElement: rendererRef.current,
        zoom: liveUiState.zoom,
        scroll: liveUiState.scroll,
        lastMouse: liveUiState.mouse,
        mouseEvent: e,
        rendererSize
      });

      uiStateActions.setMouse(nextMouse);

      const baseState: State = {
        model: modelRef.current,
        scene: sceneRef.current,
        uiState: liveUiState,
        rendererRef: rendererRef.current,
        rendererSize,
        isRendererInteraction: rendererRef.current === e.target
      };

      if (reducerTypeRef.current !== liveUiState.mode.type) {
        const prevReducer = reducerTypeRef.current
          ? modes[reducerTypeRef.current]
          : null;

        if (prevReducer && prevReducer.exit) {
          prevReducer.exit(baseState);
        }

        if (mode.entry) {
          mode.entry(baseState);
        }
      }

      modeFunction(baseState);
      reducerTypeRef.current = liveUiState.mode.type;
    },
    [uiStateActions, rendererSize]
  );

  const onContextMenu = useCallback(
    (e: Event) => {
      e.preventDefault();

      const liveUiState = uiStateRef.current;
      const liveScene = sceneRef.current;
      const itemAtTile = getItemAtTile({
        tile: liveUiState.mouse.position.tile,
        scene: liveScene
      });

      if (itemAtTile?.type === 'RECTANGLE') {
        uiStateActions.setContextMenu({
          item: itemAtTile,
          tile: liveUiState.mouse.position.tile
        });
      } else if (liveUiState.contextMenu) {
        uiStateActions.setContextMenu(null);
      }
    },
    [uiStateActions]
  );

  useEffect(() => {
    if (modeType === 'INTERACTIONS_DISABLED') return undefined;

    // When enableGlobalDragHandlers is false, confine to the interactions
    // overlay element so drag events don't leak to host-page siblings
    // (FEA10-01). el is null until uiState.rendererEl triggers a re-run.
    const el = enableGlobalDragHandlers ? null : rendererRef.current;

    // When confined to the renderer element, pointer capture ensures
    // pointermove keeps firing even when the pointer leaves the bounds
    // mid-drag — matching the behaviour you'd get from a window listener.
    const onPointerDown = (e: PointerEvent) => {
      if (el && e.currentTarget instanceof Element) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      onMouseEvent(e);
    };

    // Wheel/trackpad routing (FEA5-01):
    //   - Ctrl+wheel or Cmd+wheel → zoom (browsers also synthesise
    //     ctrlKey for trackpad pinch, so pinch keeps working).
    //   - Plain wheel → pan (deltaY = vertical, deltaX = horizontal
    //     for Magic Mouse / trackpad).
    // Step interpretation and deltaMode normalisation live in
    // `interpretWheelEvent`; this closure just dispatches the result
    // and threads the zoomBuffer (so a single trackpad swipe maps to
    // a handful of steps instead of clamping to MIN/MAX_ZOOM).
    let zoomBuffer = 0;

    const onScroll = (e: WheelEvent) => {
      // Prevent the host page from scrolling while the user is
      // zooming or panning the diagram. The standalone editor hides
      // this with a page-level `overflow: 'hidden'`, but embedders
      // that mount <Reticulyne> inside a scrollable parent would see the
      // parent scroll on every wheel tick — see BUG5-09. Requires
      // `passive: false` on addEventListener (set below).
      e.preventDefault();

      const action = interpretWheelEvent(e, zoomBuffer);
      if (action.kind === 'zoom') {
        zoomBuffer = action.nextZoomBuffer;
        for (let i = 0; i < action.steps; i += 1) {
          uiStateActions.incrementZoom();
        }
        for (let i = 0; i < -action.steps; i += 1) {
          uiStateActions.decrementZoom();
        }
      } else {
        uiStateActions.panScroll({ x: action.panDx, y: action.panDy });
      }
    };

    // passive: false is required for preventDefault() to take effect —
    // Chrome treats wheel listeners as passive by default and ignores
    // preventDefault on passive listeners.
    rendererEl?.addEventListener('wheel', onScroll, { passive: false });

    if (enableGlobalDragHandlers) {
      window.addEventListener('pointermove', onMouseEvent);
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onMouseEvent);
      window.addEventListener('contextmenu', onContextMenu);
    } else if (el) {
      el.addEventListener('pointermove', onMouseEvent);
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerup', onMouseEvent);
      el.addEventListener('contextmenu', onContextMenu);
    }

    return () => {
      rendererEl?.removeEventListener('wheel', onScroll);
      if (enableGlobalDragHandlers) {
        window.removeEventListener('pointermove', onMouseEvent);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onMouseEvent);
        window.removeEventListener('contextmenu', onContextMenu);
      } else if (el) {
        el.removeEventListener('pointermove', onMouseEvent);
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointerup', onMouseEvent);
        el.removeEventListener('contextmenu', onContextMenu);
      }
    };
  }, [
    editorMode,
    onMouseEvent,
    modeType,
    onContextMenu,
    uiStateActions,
    rendererEl,
    enableGlobalDragHandlers
  ]);

  const setInteractionsElement = useCallback((element: HTMLElement) => {
    rendererRef.current = element;
  }, []);

  return {
    setInteractionsElement
  };
};
