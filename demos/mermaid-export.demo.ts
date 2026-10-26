import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fitToView, glide, installCursor, pause, saveVideo } from './lib';

/**
 * Demo: exporting a diagram as Mermaid. The three-tier web sample is
 * exported from the main menu: the preview shows the flowchart text, with
 * the zones as subgraphs, and what did not carry across; the text is
 * copied, and the closing frames show Mermaid itself
 * (12.1, a dev dependency) drawing what was copied.
 */
const scene = JSON.parse(
  readFileSync(join(__dirname, '../samples/three-tier-web.json'), 'utf8')
);

const centre = async (locator: Locator): Promise<[number, number]> => {
  const box = (await locator.boundingBox())!;
  return [box.x + box.width / 2, box.y + box.height / 2];
};

const clickAt = async (page: Page, locator: Locator, ms = 500) => {
  await glide(page, await centre(locator), ms);
  await locator.click();
};

test('export a diagram as Mermaid', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await installCursor(page);
  await page.addInitScript((initialData) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData };
  }, scene);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
  await fitToView(page);
  await glide(page, [600, 375], 10);
  await pause(page, 1500);

  await clickAt(page, page.getByRole('button', { name: 'Main menu' }));
  await pause(page, 400);
  await clickAt(
    page,
    page.getByRole('menuitem', { name: 'Export as Mermaid' })
  );
  const dialog = page.getByRole('dialog', { name: 'Export as Mermaid' });
  const text = dialog.getByTestId('mermaid-export-text');
  await expect(text).toContainText('subgraph production_zone_1 ["Web tier"]');
  await pause(page, 2500);

  // Scroll the preview to show the links.
  await glide(page, await centre(text), 500);
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 60);
    await pause(page, 120);
  }
  await pause(page, 1500);

  await clickAt(page, dialog.getByRole('button', { name: 'Copy' }), 600);
  await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible();
  await pause(page, 1000);
  const copied = await page.evaluate(() => {
    return navigator.clipboard.readText();
  });

  // What Mermaid makes of it, on a blank page (the editor's CSP rightly
  // allows no inline script).
  await page.goto('about:blank');
  await page.setContent(
    `<!doctype html><html><body style="margin:0;font-family:sans-serif;background:#fff;height:100vh;display:flex;flex-direction:column">
      <div style="padding:14px 20px;font-size:15px;color:#333;border-bottom:1px solid #ddd">
        The copied text, drawn by Mermaid 12</div>
      <div id="out" style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px"></div>
    </body></html>`
  );
  await page.addScriptTag({
    path: require.resolve('mermaid/dist/mermaid.min.js')
  });
  const error = await page.evaluate(async (t) => {
    const m = (
      window as unknown as {
        mermaid: {
          initialize: (c: object) => void;
          render: (id: string, t: string) => Promise<{ svg: string }>;
        };
      }
    ).mermaid;
    m.initialize({ startOnLoad: false, securityLevel: 'strict' });
    try {
      const { svg } = await m.render('demo', t);
      const out = document.getElementById('out')!;
      out.innerHTML = svg;
      const el = out.querySelector('svg')!;
      // Drawn to the width of the frame, so the recording can be read.
      el.style.width = '1160px';
      el.style.maxWidth = 'none';
      el.style.height = 'auto';
      return null;
    } catch (e) {
      return String(e);
    }
  }, copied);
  expect(error).toBeNull();
  await expect(page.locator('#out svg')).toContainText('Load balancer');
  await page.mouse.move(1199, 749);
  await pause(page, 4500);
  await saveVideo(page, testInfo, 'mermaid-export');
});
