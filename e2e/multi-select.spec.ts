import { expect, test, Page } from '@playwright/test';

/**
 * 1.4 — real multi-select, driven through the browser.
 *
 * The unit tests cover the mode handlers and the store in isolation; this
 * spec exists because marquee-select is a *drag*, and the bug that made
 * marquee impossible in the first place (the Pointer Events migration
 * leaving `mouse.mousedown` permanently null) is invisible to any test
 * that doesn't dispatch real pointer events at a real renderer.
 *
 * Assertions go through the inspector panel's "N selected" header, which
 * is the one selection-count readout the DOM exposes.
 *
 * Deliberately does NOT use the FEA5-02 spec's `beforeEach`, which waits
 * for a 100% zoom chip. The dev example auto-fits on load (22% at this
 * viewport), so that precondition cannot pass here.
 */

const CANVAS = { left: 300, top: 120, right: 1240, bottom: 620 };

const openEditor = async (page: Page) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  // Wait for the diagram to have rendered something selectable.
  await expect(page.locator('svg').first()).toBeVisible();
  await page.waitForTimeout(500);
};

const marquee = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts: { shift?: boolean } = {}
) => {
  await page.mouse.move(from.x, from.y);
  if (opts.shift) await page.keyboard.down('Shift');
  await page.mouse.down();
  // Several intermediate moves: the band recomputes per pointermove, and
  // a single jump would not exercise that path.
  const steps = 6;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps
    );
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  if (opts.shift) await page.keyboard.up('Shift');
  await page.waitForTimeout(150);
};

// The multi-select inspector header reads "<n> selected".
const selectedCount = async (page: Page): Promise<number> => {
  const header = page.locator('text=/^[0-9]+ selected$/').first();
  if ((await header.count()) === 0) return 0;
  const text = await header.textContent();
  return Number((text ?? '0').replace(' selected', ''));
};

test.describe('1.4 — multi-select', () => {
  test('a marquee drag across the canvas selects several items', async ({
    page
  }) => {
    await openEditor(page);
    expect(await selectedCount(page)).toBe(0);

    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.right - 60, y: CANVAS.bottom - 60 }
    );

    // The airport example has many nodes in that region; the precise count
    // depends on the auto-fit zoom, so assert "more than one" rather than
    // pinning a number the example content could change.
    expect(await selectedCount(page)).toBeGreaterThan(1);
  });

  test('Escape clears a marquee selection', async ({ page }) => {
    await openEditor(page);
    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.right - 60, y: CANVAS.bottom - 60 }
    );
    expect(await selectedCount(page)).toBeGreaterThan(1);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    expect(await selectedCount(page)).toBe(0);
  });

  test('a marquee over empty space selects nothing', async ({ page }) => {
    await openEditor(page);

    // Top-left of the canvas, clear of the diagram at the auto-fit zoom.
    await marquee(
      page,
      { x: CANVAS.left + 20, y: CANVAS.top - 20 },
      { x: CANVAS.left + 90, y: CANVAS.top + 20 }
    );

    expect(await selectedCount(page)).toBe(0);
  });

  test('Ctrl+A selects everything, and reports more than a marquee does', async ({
    page
  }) => {
    await openEditor(page);

    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.left + 300, y: CANVAS.top + 300 }
    );
    const swept = await selectedCount(page);
    expect(swept).toBeGreaterThan(0);

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(150);

    expect(await selectedCount(page)).toBeGreaterThan(swept);
  });

  test('Shift+marquee adds to an existing selection', async ({ page }) => {
    await openEditor(page);

    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.left + 300, y: CANVAS.top + 300 }
    );
    const first = await selectedCount(page);
    expect(first).toBeGreaterThan(0);

    // A second band over a different region, with Shift held.
    await marquee(
      page,
      { x: CANVAS.left + 320, y: CANVAS.top + 310 },
      { x: CANVAS.right - 100, y: CANVAS.bottom - 40 },
      { shift: true }
    );

    expect(await selectedCount(page)).toBeGreaterThan(first);
  });

  // Layer ordering throws `Invalid item type` for anything but a rectangle
  // (src/stores/reducers/layerOrdering.ts; ROADMAP 1.3 would widen it). The
  // panel therefore filters to rectangles — this asserts the mixed selection
  // that first exposed the crash stays usable.
  test('Front / Back on a mixed selection does not crash the editor', async ({
    page
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => {
      errors.push(e.message);
    });

    await openEditor(page);
    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.right - 60, y: CANVAS.bottom - 60 }
    );
    expect(await selectedCount(page)).toBeGreaterThan(1);

    // Asserted rather than skipped-if-absent: a conditional click would let
    // this test pass vacuously the day the band stops catching a rectangle.
    const front = page.getByRole('button', { name: 'Front' });
    await expect(front).toBeVisible();
    await front.click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
    // Still selected, still rendering the panel.
    expect(await selectedCount(page)).toBeGreaterThan(1);
  });

  test('the multi-select panel offers Delete, and it removes the selection', async ({
    page
  }) => {
    await openEditor(page);

    await marquee(
      page,
      { x: CANVAS.left + 60, y: CANVAS.top + 120 },
      { x: CANVAS.left + 300, y: CANVAS.top + 300 }
    );
    expect(await selectedCount(page)).toBeGreaterThan(1);

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(200);

    expect(await selectedCount(page)).toBe(0);
  });
});
