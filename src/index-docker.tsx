// This is an entry point for the Docker image build.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Box } from '@mui/material';
import GlobalStyles from '@mui/material/GlobalStyles';
import Isoflow, { INITIAL_DATA } from 'src/Isoflow';
import type { InitialData } from 'src/types';
import type { EditorModeEnum } from 'src/types/common';
import { icons, colors } from './examples/initialData';

// E2E test hook. The Playwright suite injects this global via
// `page.addInitScript(...)` BEFORE navigation, so the docker editor
// mounts with an override fixture instead of the empty default. This
// hook is exclusive to the Docker entry — it is not in the published
// library bundle (`dist/index.js`) and is not part of the public API.
//
// Production deployments of the Docker image never set this global, so
// the hook is a single optional-chained read at module load.
declare global {
  interface Window {
    __ISOFLOW_E2E__?: {
      initialData?: InitialData;
      editorMode?: keyof typeof EditorModeEnum;
      /**
       * When true, wrap the editor in a scrolling parent taller than
       * the viewport. Exercises the BUG5-09 wheel-preventDefault fix
       * for embedders mounted inside a scrollable host. Production
       * deployments leave this undefined; the wrapper only appears in
       * the e2e suite.
       */
      scrollParent?: boolean;
    };
  }
}

const e2eConfig = window.__ISOFLOW_E2E__;
const initialData = e2eConfig?.initialData ?? {
  ...INITIAL_DATA,
  icons,
  colors
};
const editorMode = e2eConfig?.editorMode;
const scrollParent = e2eConfig?.scrollParent ?? false;

// FEA5-06: optional opt-in for the connector animation feature, kept
// off by default so a production docker deployment matches the
// pre-FEA5-06 behaviour. Pass `?animate=1` on the URL to flip the
// toggle on for manual review without rebuilding the image.
const enableAnimation =
  new URLSearchParams(window.location.search).get('animate') === '1';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Default shell — the editor fills the viewport, matching the
// production Docker deployment shape. The scrollParent branch wraps
// the editor in an outer Box that's twice the viewport height with
// overflow:auto, so the BUG5-09 e2e fixture can verify the wheel
// listener's preventDefault keeps the outer Box's scroll position
// pinned at zero while the user zooms the canvas.
const Shell = scrollParent ? (
  <Box
    data-testid="scroll-parent"
    sx={{ width: '100vw', height: '100vh', overflow: 'auto' }}
  >
    <Box sx={{ width: '100vw', height: '200vh' }}>
      <Box sx={{ width: '100vw', height: '100vh' }}>
        <Isoflow
          initialData={initialData}
          editorMode={editorMode}
          enableAnimation={enableAnimation}
        />
      </Box>
    </Box>
  </Box>
) : (
  <Box sx={{ width: '100vw', height: '100vh' }}>
    <Isoflow
      initialData={initialData}
      editorMode={editorMode}
      enableAnimation={enableAnimation}
    />
  </Box>
);

root.render(
  <React.StrictMode>
    <GlobalStyles
      styles={{
        body: {
          margin: 0
        }
      }}
    />
    {Shell}
  </React.StrictMode>
);
