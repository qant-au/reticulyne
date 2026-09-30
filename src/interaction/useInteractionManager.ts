import { useCallback, useEffect, useRef } from 'react';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  ModeActions,
  State,
  SlimMouseEvent,
  Coords,
  Mouse,
  ItemReference
} from 'src/types';
import {
  getMouse,
  getItemAtTile,
  clickTarget,
  hasLocked,
  isLocked,
  collapsedBoxAt,
  groupMembers,
  pointerTilePosition
} from 'src/utils';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { useScene } from 'src/hooks/useScene';
import { Cursor } from './modes/Cursor';
import { DragItems } from './modes/DragItems';
import { Marquee } from './modes/Marquee';
import { DrawRectangle } from './modes/Rectangle/DrawRectangle';
import { TransformRectangle } from './modes/Rectangle/TransformRectangle';
import { Connector } from './modes/Connector';
import { Pan } from './modes/Pan';
import { PlaceIcon } from './modes/PlaceIcon';
import { TextBox } from './modes/TextBox';
import { interpretWheelEvent } from './wheelInput';
import { PinchStart, startPinch, updatePinch } from './touchInput';
import type { State as StoreState } from 'src/stores/reducers/types';

const modes: { [k in string]: ModeActions } = {
  CURSOR: Cursor,
  DRAG_ITEMS: DragItems,
  MARQUEE: Marquee,
  // Only the rectangle modes are keyed {node.type}.{action}.
  'RECTANGLE.DRAW': DrawRectangle,
  'RECTANGLE.TRANSFORM': TransformRectangle,
  CONNECTOR: Connector,
  PAN: Pan,
  PLACE_ICON: PlaceIcon,
  TEXTBOX: TextBox
};

// lw-089: the gestures Esc cancels, putting back what they moved.
const isDragMode = (type: string) => {
  return type === 'DRAG_ITEMS' || type === 'RECTANGLE.TRANSFORM';
};

// 1.6: how far the pointer may travel between press and release and still
// count as a click rather than the end of a drag or a pan.
const CLICK_SLOP_PX = 5;

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

  // Worklist 29: the pointer as of the last event, kept in a ref that is
  // written on every event. uiStateRef only refreshes after a render, so
  // reading the pointer from it made every handler one event behind: a
  // press straight after a jump was tested against where the pointer had
  // been (the first click after an export missed its item), and pan lagged
  // by one move. Deltas are computed from this ref for the same reason.
  const lastMouseRef = useRef<Mouse | null>(null);
  const clickRef = useRef<{ at: Coords; item: ItemReference | null } | null>(
    null
  );

  // lw-089: Esc cancels a drag. `origin` is the diagram at the press, before
  // an Alt+drag made its copies; `selection` is what was selected just
  // before the drag began, so the originals are selected again rather than
  // copies that no longer exist. `swallowUp` keeps the release that ends a
  // cancelled drag from reaching the cursor tool, which would clear the
  // selection as a click on empty canvas.
  const gestureRef = useRef<{
    origin: StoreState | null;
    selection: ItemReference[] | null;
    swallowUp: boolean;
  }>({ origin: null, selection: null, swallowUp: false });

  // two touch pointers are a pinch, handled here and never
  // passed to the mode handlers. The finger left down when a pinch ends is
  // ignored until it lifts, so it cannot turn into a stray drag.
  const touchRef = useRef<{
    pointers: Map<number, Coords>;
    pinch: PinchStart | null;
    ignored: Set<number>;
  }>({ pointers: new Map(), pinch: null, ignored: new Set() });

  const interceptTouch = useCallback(
    (e: PointerEvent): boolean => {
      if (e.pointerType !== 'touch' || !rendererRef.current) return false;
      const t = touchRef.current;
      const rect = rendererRef.current.getBoundingClientRect();
      const at = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const live = uiStateRef.current;

      if (e.type === 'pointerdown') {
        t.pointers.set(e.pointerId, at);
        if (t.pointers.size !== 2) return false;
        const [a, b] = [...t.pointers.values()];
        t.pinch = startPinch(
          a,
          b,
          live.zoom,
          live.scroll.position,
          rendererSize
        );
        // The first finger may already have started a drag, a marquee or a
        // tool action: abandon it and hand the gesture to the pinch.
        const released = {
          ...(lastMouseRef.current ?? live.mouse),
          mousedown: null
        };
        lastMouseRef.current = released;
        uiStateActions.setMouse(released);
        if (live.mode.type !== 'CURSOR' && live.mode.type !== 'PAN') {
          uiStateActions.setMode({
            type: 'CURSOR',
            showCursor: true,
            mousedownItem: null
          });
        } else if (live.mode.type === 'CURSOR') {
          uiStateActions.setMode({ ...live.mode, mousedownItem: null });
        }
        return true;
      }

      if (e.type === 'pointermove') {
        if (t.ignored.has(e.pointerId)) return true;
        if (!t.pointers.has(e.pointerId)) return false;
        t.pointers.set(e.pointerId, at);
        if (!t.pinch) return false;
        const [a, b] = [...t.pointers.values()];
        const next = updatePinch(t.pinch, a, b, rendererSize);
        uiStateActions.setZoom(next.zoom);
        uiStateActions.setScroll({
          position: next.scroll,
          offset: live.scroll.offset
        });
        return true;
      }

      // pointerup / pointercancel
      t.pointers.delete(e.pointerId);
      if (t.ignored.delete(e.pointerId)) return true;
      if (t.pinch) {
        t.pinch = null;
        t.pointers.forEach((_, id) => {
          t.ignored.add(id);
        });
        return true;
      }
      return false;
    },
    [uiStateActions, rendererSize]
  );

  const onMouseEvent = useCallback(
    (e: MouseEvent) => {
      if (!rendererRef.current) return;
      // A property check, not instanceof: PointerEvent is not a global in
      // every environment (jsdom).
      if ('pointerType' in e && interceptTouch(e as PointerEvent)) return;

      const liveUiState = uiStateRef.current;
      const mode = modes[liveUiState.mode.type];
      const modeFunction = getModeFunction(mode, e);

      if (!modeFunction) return;

      const nextMouse = getMouse({
        interactiveElement: rendererRef.current,
        zoom: liveUiState.zoom,
        scroll: liveUiState.scroll,
        lastMouse: lastMouseRef.current ?? liveUiState.mouse,
        mouseEvent: e,
        rendererSize,
        projection: sceneRef.current.projection
      });

      lastMouseRef.current = nextMouse;
      uiStateActions.setMouse(nextMouse);

      const gesture = gestureRef.current;
      if (e.type === 'pointerdown') {
        gesture.origin = sceneRef.current.getState();
        gesture.selection = null;
      }

      const baseState: State = {
        model: modelRef.current,
        scene: sceneRef.current,
        // The pointer as of THIS event (see lastMouseRef).
        uiState: { ...liveUiState, mouse: nextMouse },
        rendererRef: rendererRef.current,
        rendererSize,
        isRendererInteraction: rendererRef.current === e.target,
        // 1.4: Shift extends the selection; captured here because mode
        // handlers only ever see `State`, never the event itself.
        modifiers: {
          shift: e.shiftKey,
          ctrlOrMeta: e.ctrlKey || e.metaKey,
          alt: e.altKey
        }
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

      reducerTypeRef.current = liveUiState.mode.type;
      if (e.type === 'pointerup' && gesture.swallowUp) {
        gesture.swallowUp = false;
        clickRef.current = null;
        return;
      }

      const selectionBefore = uiStateActions.get().selection;
      modeFunction(baseState);
      if (
        !isDragMode(liveUiState.mode.type) &&
        isDragMode(uiStateActions.get().mode.type)
      ) {
        gesture.selection = selectionBefore;
      }

      // 1.6: onNodeClick / onConnectorClick. A click is a press and release
      // on the same spot with the select or pan tool, so the end of a drag
      // or a pan is not one. Fired after the mode handler, so a host that
      // reads the selection in its callback sees the click's result.
      if (e.type === 'pointerdown') {
        const tool = liveUiState.mode.type;
        clickRef.current =
          (tool === 'CURSOR' || tool === 'PAN') &&
          baseState.isRendererInteraction &&
          e.button === 0
            ? {
                at: nextMouse.position.screen,
                item: getItemAtTile({
                  tile: nextMouse.position.tile,
                  scene: sceneRef.current
                })
              }
            : null;
      } else if (e.type === 'pointerup' && clickRef.current) {
        const { at, item } = clickRef.current;
        clickRef.current = null;
        const end = nextMouse.position.screen;
        if (item && Math.hypot(end.x - at.x, end.y - at.y) < CLICK_SLOP_PX) {
          const live = uiStateRef.current;
          if (item.type === 'ITEM') live.onNodeClick?.(item.id);
          if (item.type === 'CONNECTOR') live.onConnectorClick?.(item.id);
        }
      }
    },
    [uiStateActions, rendererSize, interceptTouch]
  );

  // double-click an empty tile to add an item there, or an
  // item to open its inspector. EDITABLE only, and only from the plain
  // cursor tool, so it never fights a drawing or placing mode.
  const onDoubleClick = useCallback(
    (e: Event) => {
      const liveUiState = uiStateRef.current;
      if (liveUiState.editorMode !== 'EDITABLE') return;
      if (liveUiState.mode.type !== 'CURSOR') return;

      const tile = liveUiState.mouse.position.tile;
      const itemAtTile = getItemAtTile({ tile, scene: sceneRef.current });
      e.preventDefault();

      // lw-062: double-clicking a collapsed group's box expands it, with
      // its members selected. Anywhere on the box, and over a connector
      // drawn to it; only a node shown on those tiles comes first.
      const box =
        itemAtTile?.type === 'ITEM'
          ? null
          : collapsedBoxAt(
              sceneRef.current.visibleView,
              pointerTilePosition({
                mouse: liveUiState.mouse.position.screen,
                zoom: liveUiState.zoom,
                scroll: liveUiState.scroll,
                rendererSize,
                projection: sceneRef.current.projection
              })
            );
      if (box) {
        sceneRef.current.updateGroup(box.groupId, { collapsed: undefined });
        uiStateActions.setSelection(
          groupMembers(sceneRef.current.currentView, box.groupId)
        );
        return;
      }

      // lw-069: a locked item is neither selected nor built on.
      if (itemAtTile && isLocked(sceneRef.current.currentView, itemAtTile)) {
        return;
      }

      if (itemAtTile) {
        // 1.7: double-clicking a group member enters the group and selects
        // the next level down; outside groups it selects the item.
        const view = sceneRef.current.currentView;
        const outer = clickTarget(view, itemAtTile, liveUiState.editingGroupId);
        if (outer.groupId) {
          uiStateActions.setEditingGroupId(outer.groupId);
          uiStateActions.setSelection(
            clickTarget(view, itemAtTile, outer.groupId).refs
          );
          return;
        }
        uiStateActions.setSelection([itemAtTile]);
        return;
      }

      uiStateActions.setItemControls({ type: 'ADD_ITEM', tile });
      uiStateActions.setMode({
        type: 'PLACE_ICON',
        showCursor: true,
        id: null
      });
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

      // 1.3: every kind with a layer order gets the menu, and since lw-069
      // nodes too (for Lock; they are depth-sorted, so they get no layer
      // actions), and the empty canvas when something is locked (Unlock
      // all). A locked item is found here, unlike on a click, so it can be
      // unlocked. Every entry in the menu edits the diagram, so read-only
      // modes get none.
      if (
        liveUiState.editorMode === 'EDITABLE' &&
        (itemAtTile?.type === 'ITEM' ||
          itemAtTile?.type === 'RECTANGLE' ||
          itemAtTile?.type === 'TEXTBOX' ||
          itemAtTile?.type === 'CONNECTOR' ||
          (!itemAtTile && hasLocked(liveScene.visibleView)))
      ) {
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
        const { zoom: before, scroll } = uiStateActions.get();
        for (let i = 0; i < action.steps; i += 1) {
          uiStateActions.incrementZoom();
        }
        for (let i = 0; i < -action.steps; i += 1) {
          uiStateActions.decrementZoom();
        }
        // Zoom about the pointer, as Excalidraw does, not the screen
        // centre: keep the diagram point under the pointer where it is.
        const after = uiStateActions.get().zoom;
        const rect = rendererEl?.getBoundingClientRect();
        if (rect && after !== before) {
          const c = {
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2
          };
          const k = after / before;
          uiStateActions.setScroll({
            position: {
              x: c.x - (c.x - scroll.position.x) * k,
              y: c.y - (c.y - scroll.position.y) * k
            },
            offset: scroll.offset
          });
        }
      } else {
        uiStateActions.panScroll({ x: action.panDx, y: action.panDy });
      }
    };

    // passive: false is required for preventDefault() to take effect —
    // Chrome treats wheel listeners as passive by default and ignores
    // preventDefault on passive listeners.
    rendererEl?.addEventListener('wheel', onScroll, { passive: false });
    // On the renderer element in both drag-handler modes: a double-click
    // in a UI panel must never add an item.
    rendererEl?.addEventListener('dblclick', onDoubleClick);

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
      rendererEl?.removeEventListener('dblclick', onDoubleClick);
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
    onDoubleClick,
    uiStateActions,
    rendererEl,
    enableGlobalDragHandlers
  ]);

  // lw-089: Esc during a drag puts everything the drag moved back, and the
  // drag leaves no undo step. Captured on the window so it runs before the
  // keyboard shortcuts' Esc, which would clear the selection as well.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const live = uiStateActions.get();
      const gesture = gestureRef.current;
      if (!isDragMode(live.mode.type) || !gesture.origin) return;
      e.preventDefault();
      e.stopPropagation();

      sceneRef.current.restoreState(gesture.origin);
      if (gesture.selection) uiStateActions.setSelection(gesture.selection);
      uiStateActions.setMode({
        type: 'CURSOR',
        showCursor: true,
        mousedownItem: null
      });
      // The button is still held: without its press the cursor tool
      // treats further movement as a hover, not a marquee.
      if (lastMouseRef.current) {
        lastMouseRef.current = { ...lastMouseRef.current, mousedown: null };
        uiStateActions.setMouse(lastMouseRef.current);
      }
      gestureRef.current = { origin: null, selection: null, swallowUp: true };
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [uiStateActions]);

  const setInteractionsElement = useCallback((element: HTMLElement) => {
    rendererRef.current = element;
  }, []);

  return {
    setInteractionsElement
  };
};
