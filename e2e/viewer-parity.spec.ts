import { expect, test, Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { waitForCanvasSettled, waitForViewerSettled } from './canvasSettled';

/**
 * The read-only viewer (@reticulyne/editor/viewer) draws a diagram as the
 * editor's own read-only render does: every sample, every view, as saved
 * and flat, compared pixel by pixel at the same size. The editor side is
 * parity.html, the render Export as image makes (NON_INTERACTIVE, fitted,
 * no grid); the viewer side is viewer.html. Both are pages of the examples
 * app (http://localhost:2223).
 *
 * A pixel differs when any channel is more than DELTA apart, which allows
 * for anti-aliasing at the edges of the same shape; at most MAX_DIFF of the
 * pixels may differ.
 */

const EXAMPLES =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';
const SIZE = { width: 1280, height: 800 };
const DELTA = 48;
const MAX_DIFF = 0.015;

const SAMPLES_DIR = join(__dirname, '../samples');
const samples = readdirSync(SAMPLES_DIR)
  .filter((file) => {
    return file.endsWith('.json');
  })
  .sort()
  .map((file) => {
    const scene = JSON.parse(readFileSync(join(SAMPLES_DIR, file), 'utf8'));
    return { name: file.replace(/\.json$/, ''), scene };
  });

type Projection = 'iso' | 'flat' | undefined;

interface Look {
  theme: 'light' | 'dark';
  grid: boolean;
}
const PLAIN: Look = { theme: 'light', grid: false };

// Playwright's WebKit puts a style sheet of its own into every page, which
// a page with a strict style-src refuses: measured on a blank page holding
// nothing but the policy and a paragraph. Not the viewer's; ignored.
const HARNESS_STYLE_REFUSAL = /^Refused to apply a stylesheet because its hash/;

const watch = (page: Page, browserName: string) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (browserName === 'webkit' && HARNESS_STYLE_REFUSAL.test(msg.text())) {
      return;
    }
    problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    problems.push(`failed: ${request.url()}`);
  });
  return problems;
};

const editorShot = async (
  page: Page,
  scene: unknown,
  viewId: string,
  projection: Projection,
  look: Look
) => {
  await page.setViewportSize(SIZE);
  await page.addInitScript(
    (config) => {
      (
        window as unknown as { __RETICULYNE_PARITY__: unknown }
      ).__RETICULYNE_PARITY__ = config;
    },
    { scene, viewId, projection, ...look, ...SIZE }
  );
  await page.goto(`${EXAMPLES}/parity.html`);
  await waitForCanvasSettled(page);
  return page.getByTestId('editor-container').screenshot();
};

const viewerShot = async (
  page: Page,
  scene: unknown,
  viewId: string,
  projection: Projection,
  look: Look
) => {
  await page.setViewportSize(SIZE);
  await page.addInitScript(
    (config) => {
      (
        window as unknown as { __RETICULYNE_VIEWER_E2E__: unknown }
      ).__RETICULYNE_VIEWER_E2E__ = config;
    },
    {
      scene,
      options: {
        viewId,
        theme: look.theme,
        grid: look.grid,
        ...(projection ? { projection } : {})
      },
      ...SIZE
    }
  );
  await page.goto(`${EXAMPLES}/viewer.html`);
  await waitForViewerSettled(page);
  // No caret or animation handling: Playwright does those with a style
  // sheet it injects, which viewer.html's Content Security Policy refuses
  // (and WebKit reports as a console error).
  return page
    .getByTestId('viewer-container')
    .screenshot({ caret: 'initial', animations: 'allow' });
};

/** The share of pixels that differ, and a picture of where. */
const compare = async (page: Page, a: Buffer, b: Buffer) => {
  return page.evaluate(
    async ({ left, right, delta }) => {
      const load = async (base64: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${base64}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const [x, y] = await Promise.all([load(left), load(right)]);
      if (x.width !== y.width || x.height !== y.height) {
        return {
          ratio: 1,
          diff: '',
          size: `${x.width}x${x.height} vs ${y.width}x${y.height}`
        };
      }
      const out = document.createElement('canvas');
      out.width = x.width;
      out.height = x.height;
      const octx = out.getContext('2d')!;
      const diff = octx.createImageData(x.width, x.height);
      let differing = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const d = Math.max(
          Math.abs(x.data[i] - y.data[i]),
          Math.abs(x.data[i + 1] - y.data[i + 1]),
          Math.abs(x.data[i + 2] - y.data[i + 2])
        );
        if (d > delta) {
          differing += 1;
          diff.data[i] = 255;
          diff.data[i + 3] = 255;
        } else {
          diff.data[i] =
            diff.data[i + 1] =
            diff.data[i + 2] =
              255 - (255 - x.data[i]) / 4;
          diff.data[i + 3] = 255;
        }
      }
      octx.putImageData(diff, 0, 0);
      return {
        ratio: differing / (x.width * x.height),
        diff: out.toDataURL('image/png').split(',')[1],
        size: `${x.width}x${x.height}`
      };
    },
    { left: a.toString('base64'), right: b.toString('base64'), delta: DELTA }
  );
};

const cases: {
  name: string;
  scene: unknown;
  viewId: string;
  projection: Projection;
  look: Look;
}[] = [];
for (const { name, scene } of samples) {
  const views = (scene.views as { id: string; kind?: string }[]).filter((v) => {
    return v.kind !== 'plan';
  });
  for (const view of views) {
    for (const projection of [undefined, 'flat'] as Projection[]) {
      cases.push({ name, scene, viewId: view.id, projection, look: PLAIN });
    }
  }
}
// The grid and the dark canvas, on one sample each, in both projections.
const byName = (n: string) => {
  return samples.find((s) => {
    return s.name === n;
  })!;
};
for (const projection of [undefined, 'flat'] as Projection[]) {
  const office = byName('office-network');
  cases.push({
    name: `${office.name} with the grid`,
    scene: office.scene,
    viewId: office.scene.views[0].id,
    projection,
    look: { theme: 'light', grid: true }
  });
  const web = byName('three-tier-web');
  cases.push({
    name: `${web.name} on the dark canvas`,
    scene: web.scene,
    viewId: web.scene.views[0].id,
    projection,
    look: { theme: 'dark', grid: false }
  });
}

for (const { name, scene, viewId, projection, look } of cases) {
  const label = `${name} / ${viewId} / ${projection ?? 'as saved'}`;
  test(`the viewer draws ${label} as the editor does`, async ({
    browser,
    browserName
  }, testInfo) => {
    const editor = await browser.newPage();
    const viewer = await browser.newPage();
    const editorProblems = watch(editor, browserName);
    const viewerProblems = watch(viewer, browserName);
    const [a, b] = await Promise.all([
      editorShot(editor, scene, viewId, projection, look),
      viewerShot(viewer, scene, viewId, projection, look)
    ]);
    const result = await compare(viewer, a, b);
    const dir = join(testInfo.outputDir, 'parity');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'editor.png'), a);
    await writeFile(join(dir, 'viewer.png'), b);
    if (result.diff) {
      await writeFile(
        join(dir, 'diff.png'),
        Buffer.from(result.diff, 'base64')
      );
    }
    await testInfo.attach('result', {
      body: JSON.stringify({ ratio: result.ratio, size: result.size }),
      contentType: 'application/json'
    });
    console.log(
      `${label}: ${(result.ratio * 100).toFixed(2)}% differ (${result.size})`
    );
    expect(viewerProblems).toEqual([]);
    expect(editorProblems).toEqual([]);
    expect(result.ratio).toBeLessThanOrEqual(MAX_DIFF);
    await editor.close();
    await viewer.close();
  });
}
