// parity.html in the examples app, for e2e/viewer-parity.spec.ts only: the
// editor's own read-only render of a diagram, as Export as image makes it
// (NON_INTERACTIVE, fitted, no grid), at a given size. The spec draws the
// same diagram with the read-only viewer (viewer.html) and compares them.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Reticulyne } from 'src/Reticulyne';
import { readScene } from 'src/scene/read';
import { sceneToModel } from 'src/scene/convert';
import { diagramBg } from 'src/kit/palette';

declare global {
  interface Window {
    __RETICULYNE_PARITY__?: {
      scene: unknown;
      viewId?: string;
      projection?: 'iso' | 'flat';
      theme?: 'light' | 'dark';
      grid?: boolean;
      width: number;
      height: number;
    };
  }
}

const config = window.__RETICULYNE_PARITY__;
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

if (config) {
  const read = readScene(config.scene);
  if (!read.ok) throw new Error('parity: the scene does not read');
  const { model } = sceneToModel(read.scene);
  const kind: 'iso' | 'schematic' | undefined =
    config.projection === 'flat' ? 'schematic' : config.projection;
  const views = kind
    ? model.views.map((view) => {
        return { ...view, kind };
      })
    : model.views;
  const theme = config.theme ?? 'light';
  root.render(
    <React.StrictMode>
      <div
        data-testid="editor-container"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: config.width,
          height: config.height
        }}
      >
        <Reticulyne
          editorMode="NON_INTERACTIVE"
          themeMode={theme}
          initialData={{
            ...model,
            views,
            fitToView: true,
            view: config.viewId ?? views[0].id
          }}
          renderer={{
            showGrid: Boolean(config.grid),
            backgroundColor: diagramBg(theme)
          }}
        />
      </div>
    </React.StrictMode>
  );
}
