// viewer.html in the examples app: the read-only viewer on a page with no
// React, MUI or editor, under a strict Content Security Policy. Pick a
// sample (or open a diagram file), a floor, how it is drawn, and the theme.

import {
  renderDiagram,
  ViewerError,
  type Viewer,
  type ViewerOptions,
  type ViewerProjection
} from 'src/viewer';
import { setStyle } from 'src/viewer/dom';
import { SAMPLES } from './samples';

declare global {
  interface Window {
    /** e2e: draw this scene alone, at this size, with no page around it. */
    __RETICULYNE_VIEWER_E2E__?: {
      scene: unknown;
      options?: ViewerOptions;
      width: number;
      height: number;
    };
    /** e2e: the viewer on the page. */
    __RETICULYNE_VIEWER__?: Viewer;
  }
}

const page = document.getElementById('viewer-page')!;
setStyle(document.body, { margin: '0' });

const e2e = window.__RETICULYNE_VIEWER_E2E__;

if (e2e) {
  const box = document.createElement('div');
  box.dataset.testid = 'viewer-container';
  setStyle(box, {
    position: 'fixed',
    left: 0,
    top: 0,
    width: e2e.width,
    height: e2e.height
  });
  page.appendChild(box);
  window.__RETICULYNE_VIEWER__ = renderDiagram(box, e2e.scene, e2e.options);
} else {
  const field = (label: string, control: HTMLElement) => {
    const wrap = document.createElement('div');
    setStyle(wrap, { display: 'flex', alignItems: 'center', gap: 6 });
    const text = document.createElement('label');
    const id = `viewer-${label.toLowerCase()}`;
    control.setAttribute('id', id);
    text.htmlFor = id;
    text.textContent = label;
    wrap.append(text, control);
    return wrap;
  };
  const select = (options: [string, string][]) => {
    const el = document.createElement('select');
    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      el.appendChild(option);
    });
    setStyle(el, { font: 'inherit' });
    return el;
  };

  setStyle(page, {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14
  });
  const bar = document.createElement('div');
  setStyle(bar, {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: '8px 16px',
    borderBottom: '1px solid #ddd',
    background: '#fff'
  });
  const heading = document.createElement('h1');
  heading.textContent = 'Reticulyne viewer';
  setStyle(heading, { fontSize: 16, margin: '0' });

  const sampleSelect = select([
    ...SAMPLES.map((s): [string, string] => {
      return [s.id, s.name];
    }),
    ['file', 'A file of your own…']
  ]);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  setStyle(fileInput, { display: 'none' });
  const floorSelect = select([]);
  const projectionSelect = select([
    ['', 'Each view as saved'],
    ['iso', 'Isometric'],
    ['flat', 'Flat']
  ]);
  const themeSelect = select([
    ['light', 'Light'],
    ['dark', 'Dark']
  ]);
  const floorField = field('Floor', floorSelect);
  bar.append(
    heading,
    field('Diagram', sampleSelect),
    fileInput,
    floorField,
    field('Drawn', projectionSelect),
    field('Theme', themeSelect)
  );

  const error = document.createElement('div');
  error.setAttribute('role', 'alert');
  setStyle(error, {
    display: 'none',
    padding: '8px 16px',
    background: '#fdecea',
    color: '#611a15'
  });
  const box = document.createElement('div');
  box.dataset.testid = 'viewer-container';
  setStyle(box, { flex: '1', minHeight: 0, position: 'relative' });
  page.append(bar, error, box);

  let viewer: Viewer | null = null;

  const showFloors = () => {
    floorSelect.replaceChildren();
    (viewer?.views ?? []).forEach((v) => {
      const option = document.createElement('option');
      option.value = v.id;
      option.textContent = v.name;
      floorSelect.appendChild(option);
    });
    floorSelect.value = viewer?.view ?? '';
    floorField.style.display =
      (viewer?.views.length ?? 0) > 1 ? 'flex' : 'none';
  };

  const open = (scene: unknown) => {
    viewer?.destroy();
    viewer = null;
    error.style.display = 'none';
    try {
      viewer = renderDiagram(box, scene, {
        theme: themeSelect.value as 'light' | 'dark',
        ...(projectionSelect.value
          ? { projection: projectionSelect.value as ViewerProjection }
          : {}),
        onViewChange: (id) => {
          floorSelect.value = id;
        }
      });
      window.__RETICULYNE_VIEWER__ = viewer;
    } catch (e) {
      const issues =
        e instanceof ViewerError && e.issues.length
          ? ` (${e.issues.length} problem${e.issues.length === 1 ? '' : 's'}, the first: ${e.issues[0].message} at ${e.issues[0].path.join('.') || 'the top level'})`
          : '';
      error.textContent = `${(e as Error).message}${issues}`;
      error.style.display = 'block';
    }
    showFloors();
  };

  const openSample = () => {
    const sample = SAMPLES.find((s) => {
      return s.id === sampleSelect.value;
    });
    if (sample) open(sample.scene);
  };

  sampleSelect.addEventListener('change', () => {
    if (sampleSelect.value === 'file') {
      fileInput.click();
      return;
    }
    openSample();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      open(String(reader.result));
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
  floorSelect.addEventListener('change', () => {
    void viewer?.setView(floorSelect.value);
  });
  projectionSelect.addEventListener('change', () => {
    void viewer?.setProjection(
      (projectionSelect.value || undefined) as ViewerProjection | undefined
    );
  });
  themeSelect.addEventListener('change', () => {
    void viewer?.setTheme(themeSelect.value as 'light' | 'dark');
  });

  openSample();
}
