// Modal / dialog layer: the drag-and-drop ghost during PLACE_ICON
// mode, the export-as-image dialog, and the context-menu anchor +
// manager. Each is independent of the others and gated on its own
// piece of ui-state.
//
// Pulled out of UiOverlay.tsx under QUA4-10 so the overlay's
// top-level JSX no longer mixes corner-positioned toolbars with
// floating popovers.

import { Suspense, lazy, useState } from 'react';
import { Box } from '@mui/material';
import { SceneLayer } from 'src/components/SceneLayer/SceneLayer';
import { DragAndDrop } from 'src/components/DragAndDrop/DragAndDrop';
import { ContextMenuManager } from 'src/components/ContextMenu/ContextMenuManager';
import type { DialogTypeEnum, Mode, Coords } from 'src/types';

// PRF-11: keep the three export dialogs and their MUI subtrees out of
// the main entry bundle. They are user-action-gated (open via main
// menu / "?" shortcut) so the load happens off the critical path; a
// null fallback is fine for the brief chunk-fetch.
const ExportImageDialog = lazy(() => {
  return import('src/components/ExportImageDialog/ExportImageDialog').then(
    (m) => {
      return { default: m.ExportImageDialog };
    }
  );
});
const ExportSvgDialog = lazy(() => {
  return import('src/components/ExportSvgDialog/ExportSvgDialog').then((m) => {
    return { default: m.ExportSvgDialog };
  });
});
const KeyboardShortcutsDialog = lazy(() => {
  return import('src/components/KeyboardShortcutsDialog/KeyboardShortcutsDialog').then(
    (m) => {
      return { default: m.KeyboardShortcutsDialog };
    }
  );
});

interface Props {
  mode: Mode;
  mouseTile: Coords;
  dialog: keyof typeof DialogTypeEnum | null;
  onCloseDialog: () => void;
}

export const DialogLayer = ({
  mode,
  mouseTile,
  dialog,
  onCloseDialog
}: Props) => {
  // Local state for the context-menu anchor. The context-menu pops
  // up at the position of the rendered <Box ref={...} /> so we need a
  // ref-callback that React resolves once on mount.
  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<HTMLDivElement | null>(null);

  return (
    <>
      {mode.type === 'PLACE_ICON' && mode.id && (
        <SceneLayer disableAnimation>
          <DragAndDrop iconId={mode.id} tile={mouseTile} />
        </SceneLayer>
      )}
      <Suspense fallback={null}>
        {dialog === 'EXPORT_IMAGE' && (
          <ExportImageDialog onClose={onCloseDialog} />
        )}
        {dialog === 'EXPORT_SVG' && <ExportSvgDialog onClose={onCloseDialog} />}
        {dialog === 'KEYBOARD_SHORTCUTS' && (
          <KeyboardShortcutsDialog onClose={onCloseDialog} />
        )}
      </Suspense>
      <SceneLayer>
        <Box ref={setContextMenuAnchor} />
        <ContextMenuManager anchorEl={contextMenuAnchor ?? undefined} />
      </SceneLayer>
    </>
  );
};
