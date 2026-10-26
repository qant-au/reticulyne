import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sceneToMermaid } from '../src/mermaid/export';
import { MERMAID_VERSIONS, mermaidRender, withMermaid } from './mermaid-lib';

/**
 * Export as Mermaid, through the menu, on every sample scene: the file
 * that downloads is what sceneToMermaid writes, and real Mermaid (12 and
 * 11) renders it with every label in the picture.
 */
const SAMPLES = [
  'three-tier-web',
  'aws-serverless',
  'office-network',
  'two-floor-building'
];

const open = async (page: Page, name: string) => {
  const scene = JSON.parse(
    readFileSync(join(__dirname, '../samples', `${name}.json`), 'utf8')
  );
  await page.addInitScript((initialData) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { initialData };
  }, scene);
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
  return scene;
};

const exportDialog = async (page: Page) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as Mermaid' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export as Mermaid' });
  await expect(dialog).toBeVisible();
  return dialog;
};

for (const name of SAMPLES) {
  test(`${name}: the .mmd download matches the preview and renders in Mermaid`, async ({
    page,
    context
  }) => {
    const scene = await open(page, name);
    const dialog = await exportDialog(page);
    const preview = await dialog
      .getByTestId('mermaid-export-text')
      .textContent();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download .mmd' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.mmd$/);
    const text = await readFile(await file.path(), 'utf8');
    expect(text).toBe(preview);
    // The editor writes what the pure function writes for the first view.
    expect(text).toBe(sceneToMermaid(scene).text);

    const labels = [
      ...text.matchAll(/\["([^"]+)"\]|\("([^"]+)"\)|\{"([^"]+)"\}/g)
    ]
      .map((m) => {
        return (m[1] ?? m[2] ?? m[3])
          .replace(/#quot;/g, '"')
          .replace(/#35;/g, '#');
      })
      .filter((l) => {
        return l.trim() && !l.includes('#');
      });
    const checker = await context.newPage();
    for (const pkg of MERMAID_VERSIONS) {
      await withMermaid(checker, pkg);
      const { svg, error } = await mermaidRender(checker, text);
      expect([pkg, error]).toEqual([pkg, null]);
      const plain = svg.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ' ');
      for (const label of labels) {
        expect([pkg, label, plain.includes(label)]).toEqual([pkg, label, true]);
      }
    }
  });
}

test('the .md download is fenced and the options change the text', async ({
  page
}) => {
  await open(page, 'three-tier-web');
  const dialog = await exportDialog(page);
  await dialog.getByLabel('Direction').click();
  await page.getByRole('option', { name: 'Top to bottom' }).click();
  await expect(dialog.getByTestId('mermaid-export-text')).toContainText(
    'flowchart TB'
  );
  await dialog.getByLabel('Mermaid 11 shapes').check();
  await expect(dialog.getByTestId('mermaid-export-summary')).toContainText(
    'Mermaid 11'
  );
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download .md' }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  expect(text.startsWith('```mermaid\n---\ntitle:')).toBe(true);
  expect(text.endsWith('```\n')).toBe(true);
  await expect(dialog.getByTestId('mermaid-export-warnings')).toContainText(
    'tile positions are not kept'
  );
});

test('Copy puts the text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, 'office-network');
  const dialog = await exportDialog(page);
  const preview = await dialog.getByTestId('mermaid-export-text').textContent();
  await dialog.getByRole('button', { name: 'Copy' }).click();
  await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible();
  const clip = await page.evaluate(() => {
    return navigator.clipboard.readText();
  });
  expect(clip).toBe(preview);
});
