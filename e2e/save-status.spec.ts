import { expect, test, Page } from '@playwright/test';

/**
 * the save-status pill, driven through the editor with a
 * host onSave injected by the Docker entry's e2e hook (index-docker.tsx).
 */
type SaveFixture = {
  autoSaveDebounce?: number | false;
  delayMs?: number;
  fail?: boolean;
};

const load = async (page: Page, save: SaveFixture) => {
  await page.addInitScript((s) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      { editorMode: 'EDITABLE', save: s };
  }, save);
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
};

const rename = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Rename diagram' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Title').press('Enter');
};

const saveCount = (page: Page) => {
  return page.evaluate(() => {
    return (
      (window as unknown as { __RETICULYNE_E2E_SAVES__?: unknown[] })
        .__RETICULYNE_E2E_SAVES__ ?? []
    ).length;
  });
};

const pill = (page: Page) => {
  return page.getByTestId('save-status');
};

test('clean on load, dirty after an edit, Saving… then Saved', async ({
  page
}) => {
  await load(page, { delayMs: 800 });
  await expect(pill(page)).toHaveCount(0);

  await rename(page, 'Edited');
  await expect(pill(page)).toHaveText('Unsaved changes');

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Save' }).click();
  await expect(pill(page)).toHaveText('Saving…');
  await expect(pill(page)).toHaveText('Saved just now');
  expect(await saveCount(page)).toBe(1);
  // onSave is handed a scene, the file format.
  const saved = await page.evaluate(() => {
    return (
      window as unknown as {
        __RETICULYNE_E2E_SAVES__: { format: string; title: string }[];
      }
    ).__RETICULYNE_E2E_SAVES__[0];
  });
  expect(saved.format).toBe('accurona-scene');
  expect(saved.title).toBe('Edited');
  expect(saved).not.toHaveProperty('items');
});

test('a failed save shows Retry, and Retry saves again', async ({ page }) => {
  await load(page, { fail: true });
  await rename(page, 'Edited');
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Save' }).click();

  await expect(pill(page)).toContainText('Save failed');
  await pill(page).getByRole('button', { name: 'Retry' }).click();
  await expect.poll(() => saveCount(page)).toBe(2);
  await expect(pill(page)).toContainText('Save failed');
});

test('auto-save, when enabled, saves after the debounce with no click', async ({
  page
}) => {
  await load(page, { autoSaveDebounce: 500 });
  await rename(page, 'Edited');
  await expect(pill(page)).toHaveText('Saved just now', { timeout: 5000 });
  expect(await saveCount(page)).toBe(1);
});

test('closing the tab with unsaved changes asks first', async ({ page }) => {
  await load(page, {});
  await rename(page, 'Edited');
  await expect(pill(page)).toHaveText('Unsaved changes');

  let asked = false;
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'beforeunload') asked = true;
    await dialog.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked).toBe(true);
});
