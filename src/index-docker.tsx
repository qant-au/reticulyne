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

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
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
    <Box sx={{ width: '100vw', height: '100vh' }}>
      <Isoflow initialData={initialData} editorMode={editorMode} />
    </Box>
  </React.StrictMode>
);
