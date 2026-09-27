// This is an entry point for the Docker image build.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Box } from '@mui/material';
import GlobalStyles from '@mui/material/GlobalStyles';
import Reticulyne, { INITIAL_DATA, readIconAsDataUrl } from 'src/Reticulyne';
import type { InitialData, Model } from 'src/types';
import { MAIN_MENU_OPTIONS } from 'src/config';
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
    __RETICULYNE_E2E__?: {
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
      /**
       * Flip the FEA5-06 connector animation feature on for the
       * e2e fixture. Equivalent to the `?animate=1` URL flag but
       * doesn't require the spec to manipulate query strings —
       * useful when a single test wants to load a custom fixture
       * AND opt into animation in one shot.
       */
      enableAnimation?: boolean;
      /**
       * 2.3: give the editor a host onSave for the save-status spec.
       * Saves are recorded on window.__RETICULYNE_E2E_SAVES__; delayMs
       * holds each save pending, fail makes it reject.
       */
      save?: {
        autoSaveDebounce?: number | false;
        delayMs?: number;
        fail?: boolean;
      };
      /**
       * 1.6: record the host click events on
       * window.__RETICULYNE_E2E_EVENTS__ as [name, id] pairs.
       */
      recordEvents?: boolean;
    };
    __RETICULYNE_E2E_SAVES__?: unknown[];
    __RETICULYNE_E2E_EVENTS__?: [string, string][];
  }
}

const e2eConfig = window.__RETICULYNE_E2E__;
const initialData = e2eConfig?.initialData ?? {
  ...INITIAL_DATA,
  icons,
  colors
};
const editorMode = e2eConfig?.editorMode;
const scrollParent = e2eConfig?.scrollParent ?? false;

const saveConfig = e2eConfig?.save;
const saveProps = saveConfig
  ? {
      mainMenuOptions: [...MAIN_MENU_OPTIONS, 'ACTION.SAVE' as const],
      autoSaveDebounce: saveConfig.autoSaveDebounce ?? false,
      onSave: (model: Model) => {
        window.__RETICULYNE_E2E_SAVES__ = [
          ...(window.__RETICULYNE_E2E_SAVES__ ?? []),
          model
        ];
        return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            if (saveConfig.fail) reject(new Error('e2e save failure'));
            else resolve();
          }, saveConfig.delayMs ?? 0);
        });
      }
    }
  : {};

const record = (name: string) => {
  return (id: string) => {
    window.__RETICULYNE_E2E_EVENTS__ = [
      ...(window.__RETICULYNE_E2E_EVENTS__ ?? []),
      [name, id]
    ];
  };
};
const eventProps = e2eConfig?.recordEvents
  ? {
      onNodeClick: record('node'),
      onConnectorClick: record('connector')
    }
  : {};

// FEA5-06: optional opt-in for the connector animation feature, kept
// off by default so a production docker deployment matches the
// pre-FEA5-06 behaviour. Pass `?animate=1` on the URL to flip the
// toggle on for manual review without rebuilding the image, or set
// `__RETICULYNE_E2E__.enableAnimation` from a Playwright spec.
const enableAnimation =
  e2eConfig?.enableAnimation ??
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
        <Reticulyne
          initialData={initialData}
          editorMode={editorMode}
          enableAnimation={enableAnimation}
          {...saveProps}
          onIconUpload={readIconAsDataUrl}
          {...eventProps}
        />
      </Box>
    </Box>
  </Box>
) : (
  <Box sx={{ width: '100vw', height: '100vh' }}>
    <Reticulyne
      initialData={initialData}
      editorMode={editorMode}
      enableAnimation={enableAnimation}
      {...saveProps}
      onIconUpload={readIconAsDataUrl}
      {...eventProps}
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
