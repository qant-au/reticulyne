import { expect, test } from '@playwright/test';

/**
 * Examples-picker container (port 2223): exercises the dev/demo bundle
 * served by the `reticulyne-examples` Docker image — `src/index.tsx` →
 * `<Examples>` → `<ExamplesSidebar>` + the currently-selected demo
 * (BasicEditor / DebugTools / ReadonlyMode / LiveDashboard /
 * ConnectorAnimations / ConnectorPulse / NodeIndicators).
 *
 * BasicEditor (default-selected) mounts `<Reticulyne>` with the bundled
 * Airport management diagram from `src/examples/initialData.ts`. These
 * checks keep that surface honest: the sidebar is present with every
 * entry, the Airport title strip renders, the canvas is non-empty, the
 * sidebar collapses/expands, and switching to a non-default example
 * still produces a non-zero zoom (proves the per-example fitToView path
 * from BUG5-12 is wired up for every entry, not just BasicEditor).
 *
 * Run locally:
 *   bash restart.sh                  # ensure both containers are up
 *   PLAYWRIGHT_BASE_URL=http://localhost:2223 npm run test:e2e -- examples-picker
 *
 * Without the env override the spec still targets 2223 directly via
 * absolute URL — the override only matters when an embedder is mirrored
 * on a different host.
 */
const BASE = process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

const EXAMPLE_NAMES = [
  'Basic editor',
  'Debug tools',
  'Read-only mode',
  'Live dashboard',
  'Connector animations',
  'Connector pulse',
  'Node indicators'
];

test.describe('examples-picker @ :2223', () => {
  test('sidebar lists every example and BasicEditor renders the Airport diagram', async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto(BASE);
    await expect(page).toHaveTitle(/Reticulyne/);

    // Sidebar is expanded by default. Every example entry is visible.
    const sidebar = page.getByTestId('examples-sidebar');
    await expect(sidebar).toBeVisible();
    for (let i = 0; i < EXAMPLE_NAMES.length; i += 1) {
      await expect(page.getByTestId(`sidebar-item-${i}`)).toHaveText(
        EXAMPLE_NAMES[i]
      );
    }

    // BasicEditor uses `initialData.title = 'Airport management software
    // system'`, surfaced by TitleBar at the bottom-centre.
    await expect(
      page.getByText('Airport management software system', { exact: true })
    ).toBeVisible();

    // initialData.views[0].name === 'Overview' — TitleBar renders it
    // after the chevron.
    await expect(page.getByText('Overview', { exact: true })).toBeVisible();

    // Airport diagram has 20 items, each rendering an <IsometricIcon>
    // with a non-empty SVG src. Several should be in the DOM once the
    // renderer has measured + projected the scene.
    const itemImages = page.locator(
      'img[src*="data:image/svg"], img[src*=".svg"]'
    );
    await expect
      .poll(async () => itemImages.count(), { timeout: 10_000 })
      .toBeGreaterThan(5);

    // Zoom indicator is non-zero — proves the deferred fitToView path
    // (BUG5-12) is wired up and produced a measurable viewport.
    const zoomReadout = page.locator('text=/^\\d+%$/').first();
    await expect(zoomReadout).toBeVisible();
    const zoomText = await zoomReadout.innerText();
    const zoomPct = parseInt(zoomText.replace('%', ''), 10);
    expect(zoomPct).toBeGreaterThan(0);

    await page.waitForTimeout(250);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('sidebar collapses to zero width and re-expands', async ({ page }) => {
    await page.goto(BASE);

    const sidebar = page.getByTestId('examples-sidebar');
    await expect(sidebar).toBeVisible();

    // Collapse via the chevron at the top of the sidebar. Width
    // animates to 0; the collapse button becomes unreachable, and the
    // floating expand button appears in the top-left corner.
    await page.getByTestId('sidebar-collapse').click();
    await expect
      .poll(async () => {
        const box = await sidebar.boundingBox();
        return box?.width ?? -1;
      }, { timeout: 2_000 })
      .toBe(0);

    const expandButton = page.getByTestId('sidebar-expand');
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    // Re-expanded sidebar returns to its full width.
    await expect
      .poll(async () => {
        const box = await sidebar.boundingBox();
        return box?.width ?? -1;
      }, { timeout: 2_000 })
      .toBeGreaterThan(200);
    await expect(page.getByTestId('sidebar-expand')).toHaveCount(0);
  });

  test('switching to Read-only mode swaps the editor surface', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto(BASE);

    // Wait for the BasicEditor to finish its initial mount so the
    // sidebar swap is a real transition (not racing the first render).
    await expect(
      page.getByText('Airport management software system', { exact: true })
    ).toBeVisible();

    await page.getByTestId('sidebar-item-2').click(); // Read-only mode

    // ReadonlyMode uses the same Airport initialData but wraps Isoflow
    // in EXPLORABLE_READONLY — the main menu button disappears, while
    // the title strip stays.
    await expect(page.getByRole('button', { name: 'Main menu' })).toHaveCount(0);
    await expect(
      page.getByText('Airport management software system', { exact: true })
    ).toBeVisible();

    await page.waitForTimeout(250);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('every example auto fits-to-view (non-zero zoom)', async ({ page }) => {
    // Tabs through every example by clicking its sidebar entry, then
    // confirms the zoom indicator never lands at 0% — i.e. every demo
    // sets `fitToView: true` and the BUG5-12 deferred-fit pipeline ran
    // for it. This is the cross-cutting regression guard for the
    // "selecting an item auto-fits the page" requirement.
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto(BASE);

    for (let i = 0; i < EXAMPLE_NAMES.length; i += 1) {
      await page.getByTestId(`sidebar-item-${i}`).click();
      const zoomReadout = page.locator('text=/^\\d+%$/').first();
      await expect(
        zoomReadout,
        `expected zoom readout visible after selecting ${EXAMPLE_NAMES[i]}`
      ).toBeVisible({ timeout: 5_000 });
      await expect
        .poll(
          async () => {
            const text = await zoomReadout.innerText();
            return parseInt(text.replace('%', ''), 10);
          },
          {
            timeout: 5_000,
            message: `${EXAMPLE_NAMES[i]} should reach non-zero zoom`
          }
        )
        .toBeGreaterThan(0);
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
