import { useEffect, useId, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInteractionManager } from 'src/interaction/useInteractionManager';
import { useKeyboardShortcuts } from 'src/interaction/useKeyboardShortcuts';
import { useSpacePan } from 'src/interaction/useSpacePan';
import { Grid } from 'src/components/Grid/Grid';
import { Cursor } from 'src/components/Cursor/Cursor';
import { Nodes } from 'src/components/SceneLayers/Nodes/Nodes';
import { Rectangles } from 'src/components/SceneLayers/Rectangles/Rectangles';
import { Groups } from 'src/components/SceneLayers/Groups/Groups';
import { Connectors } from 'src/components/SceneLayers/Connectors/Connectors';
import { ConnectorLabels } from 'src/components/SceneLayers/ConnectorLabels/ConnectorLabels';
import { ConnectorIndicators } from 'src/components/SceneLayers/ConnectorIndicators/ConnectorIndicators';
import { TextBoxes } from 'src/components/SceneLayers/TextBoxes/TextBoxes';
import { OtherFloors } from 'src/components/SceneLayers/OtherFloors/OtherFloors';
import { FloorStubs } from 'src/components/SceneLayers/FloorStubs/FloorStubs';
import { SizeIndicator } from 'src/components/DebugUtils/SizeIndicator';
import { SceneLayer } from 'src/components/SceneLayer/SceneLayer';
import { TransformControlsManager } from 'src/components/TransformControlsManager/TransformControlsManager';
import { MarqueeBand } from 'src/components/MarqueeBand/MarqueeBand';
import { ConnectorHotspots } from 'src/components/ConnectorHotspots/ConnectorHotspots';
import { SmartGuides } from 'src/components/SmartGuides/SmartGuides';
import { SearchHighlights } from 'src/components/SearchBar/SearchHighlights';
import { usePointerOverCanvas } from 'src/hooks/usePointerOverCanvas';
import { RendererProps } from 'src/types/rendererProps';
import { visuallyHidden } from 'src/components/ScreenReaderSupport/ScreenReaderSupport';

// lw-068: read by a screen reader when the canvas takes focus.
const HINTS = {
  EDITABLE:
    'Tab and Shift+Tab move between objects. Arrow keys move the selected object, Enter edits it, Delete removes it, Shift+F10 opens its menu. Ctrl+arrow keys pan. Question mark lists every shortcut.',
  EXPLORABLE_READONLY:
    'Read only. Tab and Shift+Tab move between objects. Ctrl+arrow keys pan, plus and minus zoom, F fits the diagram. Question mark lists every shortcut.',
  NON_INTERACTIVE: 'A diagram. Its outline follows the canvas.'
} as const;

export const Renderer = ({
  showGrid,
  backgroundColor,
  enableGlobalDragHandlers = true,
  enableGlobalKeyboardShortcuts = true
}: RendererProps & {
  enableGlobalDragHandlers?: boolean;
  enableGlobalKeyboardShortcuts?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The hover tile follows the pointer only over the canvas: not on
  // load, and not under the toolbar or the mini-map.
  const overCanvas = usePointerOverCanvas();
  const interactionsRef = useRef<HTMLDivElement | null>(null);
  const enableDebugTools = useUiStateStore((state) => {
    return state.enableDebugTools;
  });
  const mode = useUiStateStore((state) => {
    return state.mode;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const hintId = useId();
  const { setInteractionsElement } = useInteractionManager(
    enableGlobalDragHandlers
  );
  useKeyboardShortcuts(enableGlobalKeyboardShortcuts);
  useSpacePan(enableGlobalKeyboardShortcuts);

  useEffect(() => {
    if (!containerRef.current || !interactionsRef.current) return;

    setInteractionsElement(interactionsRef.current);
    uiStateActions.setRendererEl(containerRef.current);
  }, [setInteractionsElement, uiStateActions]);

  const isShowGrid = useMemo(() => {
    return showGrid === undefined || showGrid;
  }, [showGrid]);

  return (
    <Box
      ref={containerRef}
      role="application"
      aria-label="Diagram canvas"
      aria-roledescription="isometric diagram editor"
      aria-describedby={hintId}
      // lw-068: always focusable, so a keyboard user can reach the canvas
      // and Tab through its objects. FEA-07 made it focusable only when
      // shortcuts were scoped to it; that left the global default with no
      // way in from the keyboard.
      tabIndex={
        editorMode === 'NON_INTERACTIVE' && enableGlobalKeyboardShortcuts
          ? undefined
          : 0
      }
      sx={{
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2
        },
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        // 2.12: the editor handles touch itself (pinch, drag); without this
        // the browser takes two-finger gestures for page zoom and scroll.
        touchAction: 'none',
        bgcolor: (theme) => {
          return backgroundColor ?? theme.customVars.customPalette.diagramBg;
        }
      }}
    >
      <Box id={hintId} sx={visuallyHidden}>
        {HINTS[editorMode]}
      </Box>
      {/* lw-053: the other floors, faint, beneath everything on this one */}
      <SceneLayer>
        <OtherFloors />
      </SceneLayer>
      <SceneLayer>
        <Groups />
      </SceneLayer>
      <SceneLayer>
        <Rectangles />
      </SceneLayer>
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0
        }}
      >
        {isShowGrid && <Grid />}
      </Box>
      {mode.showCursor && overCanvas && (
        <SceneLayer>
          <Cursor />
        </SceneLayer>
      )}
      <SceneLayer>
        <Connectors />
      </SceneLayer>
      <SceneLayer>
        <TextBoxes />
      </SceneLayer>
      <SceneLayer>
        <ConnectorLabels />
      </SceneLayer>
      <SceneLayer>
        <ConnectorIndicators />
      </SceneLayer>
      {enableDebugTools && (
        <SceneLayer>
          <SizeIndicator />
        </SceneLayer>
      )}
      {/* Interaction layer: this is where events are detected */}
      <Box
        ref={interactionsRef}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%'
        }}
      />
      <SceneLayer>
        <Nodes />
      </SceneLayer>
      {/* lw-053: above the nodes, so a stub's marker can be clicked */}
      <SceneLayer>
        <FloorStubs />
      </SceneLayer>
      {/* 2.1: above the nodes, or their icons hide the ports. */}
      <SceneLayer>
        <ConnectorHotspots />
      </SceneLayer>
      <SceneLayer>
        <SmartGuides />
      </SceneLayer>
      <SceneLayer>
        <SearchHighlights />
      </SceneLayer>
      <SceneLayer>
        <TransformControlsManager />
      </SceneLayer>
      {/* Above the outlines so the band stays visible over what it catches */}
      <SceneLayer>
        <MarqueeBand />
      </SceneLayer>
    </Box>
  );
};
