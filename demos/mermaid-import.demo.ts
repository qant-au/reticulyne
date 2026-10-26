import { expect, test, type Locator, type Page } from '@playwright/test';
import { fitToView, glide, pause, saveVideo, startEmpty } from './lib';

/**
 * Demo: importing a Mermaid flowchart. A flowchart is pasted into Import
 * Mermaid, a line is added with a typo (`->` for `-->`), the error appears
 * at its line with Import held off, choosing it puts the cursor on the
 * typo, one keystroke fixes it, and the flowchart lands on the canvas laid
 * out, each node drawn as its shape and the subgraph as a group.
 */
const PASTED = [
  'flowchart LR',
  '  order([Order placed]) --> pay{Paid?}',
  '  pay -->|Yes| pick[Pick items]',
  '  pay -->|No| remind[/Send reminder/]',
  '  remind -.-> pay',
  '  subgraph warehouse [Warehouse]',
  '    pick --> pack[[Pack parcel]]',
  '    pack --> ship[(Shipping log)]',
  '  end',
  '  ship --> done(((Delivered)))'
].join('\n');
const TYPED = '\n  done -> notify[Email customer]';

const centre = async (locator: Locator): Promise<[number, number]> => {
  const box = (await locator.boundingBox())!;
  return [box.x + box.width / 2, box.y + box.height / 2];
};

const clickAt = async (page: Page, locator: Locator, ms = 500) => {
  await glide(page, await centre(locator), ms);
  await locator.click();
};

test('import a Mermaid flowchart', async ({ page }, testInfo) => {
  await startEmpty(page, 'order-flow', 'Order flow');
  await glide(page, [600, 375], 10);
  await pause(page, 800);

  await clickAt(page, page.getByRole('button', { name: 'Main menu' }));
  await pause(page, 400);
  await clickAt(page, page.getByRole('menuitem', { name: 'Import Mermaid' }));
  const dialog = page.getByRole('dialog', { name: 'Import Mermaid' });
  await expect(dialog).toBeVisible();
  await pause(page, 700);

  // Paste the flowchart: it reads cleanly.
  const box = dialog.getByTestId('mermaid-import-text');
  await clickAt(page, box);
  await box.fill(PASTED);
  await expect(dialog.getByTestId('mermaid-import-summary')).toHaveText(
    'Ready to import: 7 nodes, 7 links.'
  );
  await pause(page, 1500);

  // Add a line by hand, with a typo.
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(TYPED, { delay: 55 });
  const errors = dialog.getByTestId('mermaid-import-errors');
  await expect(errors).toContainText(
    'Line 11, col 8: "->" is not a Mermaid link. Did you mean "-->"?'
  );
  await expect(dialog.getByTestId('mermaid-import-button')).toBeDisabled();
  await pause(page, 2200);

  // Choose the error: the cursor goes to the typo. Fix it.
  await clickAt(page, errors.getByText(/Line 11, col 8/), 700);
  await pause(page, 600);
  // The selection starts at the typo; collapse to its start and add a dash.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('-', { delay: 60 });
  await expect(dialog.getByTestId('mermaid-import-summary')).toHaveText(
    'Ready to import: 8 nodes, 8 links.'
  );
  await pause(page, 1300);

  await clickAt(page, dialog.getByTestId('mermaid-import-button'), 600);
  await expect(dialog).toBeHidden();
  await fitToView(page);
  await glide(page, [1190, 740], 600);
  for (const label of ['Order placed', 'Paid?', 'Pick items', 'Send reminder',
    'Pack parcel', 'Shipping log', 'Delivered', 'Email customer']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await pause(page, 4000);
  await saveVideo(page, testInfo, 'mermaid-import');
});
