import { expect, test, Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { waitForViewerSettled } from './canvasSettled';

/**
 * The read-only viewer as a person uses it, in the examples container
 * (http://localhost:2223): the "Read-only viewer" example in the React
 * examples app, and viewer.html, the viewer on a page with no React.
 */

const BASE =
  process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

const SAMPLES_DIR = join(__dirname, '../samples');
const sample = (name: string) => {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, `${name}.json`), 'utf8'));
};
const SAMPLE_NAMES: Record<string, string> = {
  'office-network': 'Office network',
  'three-tier-web': 'Three-tier web app',
  'aws-serverless': 'AWS serverless',
  'two-floor-building': 'Two-floor building',
  'built-in-devices': 'Built-in devices',
  'mixed-icons': 'Mixed icons'
};

const problemsOf = (page: Page) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`);
  });
  page.on('console', (msg) => {
    // Playwright's WebKit refuses its own style sheet under a strict CSP
    // (see viewer-parity.spec.ts); this spec runs in Chromium only.
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`${response.status()} ${response.url()}`);
    }
  });
  return problems;
};

/** How many objects the viewer drew. */
const drawnNodes = (page: Page) => {
  return page.locator('[data-reticulyne-viewer] [data-node]').count();
};

const layerTransform = (page: Page) => {
  return page.evaluate(() => {
    const layer = document.querySelector(
      '[data-reticulyne-viewer] [data-node]'
    )?.parentElement;
    return layer ? getComputedStyle(layer).transform : 'none';
  });
};

test.describe('the Read-only viewer example', () => {
  test('opens every sample, changes floor and projection', async ({ page }) => {
    const problems = problemsOf(page);
    await page.goto(BASE);
    await page.getByText('Read-only viewer', { exact: true }).click();
    await waitForViewerSettled(page);

    const files = readdirSync(SAMPLES_DIR).filter((f) => {
      return f.endsWith('.json');
    });
    expect(files.length).toBe(Object.keys(SAMPLE_NAMES).length);
    for (const [id, name] of Object.entries(SAMPLE_NAMES)) {
      await page.getByRole('combobox', { name: 'Diagram' }).click();
      await page.getByRole('option', { name, exact: true }).click();
      await waitForViewerSettled(page);
      const scene = sample(id);
      await expect(page.locator('[data-reticulyne-viewer]')).toHaveAttribute(
        'aria-label',
        `${scene.title}: ${scene.views[0].name}`
      );
      expect(await drawnNodes(page)).toBeGreaterThan(0);
    }

    // Two floors: the floor picker shows the other one.
    await page.getByRole('combobox', { name: 'Diagram' }).click();
    await page
      .getByRole('option', { name: 'Two-floor building', exact: true })
      .click();
    await waitForViewerSettled(page);
    const building = sample('two-floor-building');
    const level1 = building.views[1];
    await page.getByRole('combobox', { name: 'Floor' }).click();
    await page.getByRole('option', { name: level1.name, exact: true }).click();
    await waitForViewerSettled(page);
    await expect(page.locator('[data-reticulyne-viewer]')).toHaveAttribute(
      'data-view',
      level1.id
    );

    // Drawn flat, then as saved again.
    await page.getByRole('combobox', { name: 'Drawn' }).click();
    await page.getByRole('option', { name: 'Flat', exact: true }).click();
    await waitForViewerSettled(page);
    await expect(page.locator('[data-reticulyne-viewer]')).toHaveAttribute(
      'data-projection',
      'flat'
    );
    await page.getByRole('combobox', { name: 'Drawn' }).click();
    await page
      .getByRole('option', { name: 'Each view as saved', exact: true })
      .click();
    await waitForViewerSettled(page);
    await expect(page.locator('[data-reticulyne-viewer]')).toHaveAttribute(
      'data-projection',
      'iso'
    );
    expect(problems).toEqual([]);
  });
});

test.describe('viewer.html', () => {
  test('loads no React and draws the first sample', async ({ page }) => {
    const problems = problemsOf(page);
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.goto(`${BASE}/viewer.html`);
    await waitForViewerSettled(page);
    expect(await drawnNodes(page)).toBe(
      sample('office-network').views[0].placements.length
    );
    // Only the viewer page's own script: the examples app (main) and the
    // parity page (the editor) are never loaded.
    expect(
      scripts.every((url) => {
        return /\/viewer\.[0-9a-f]+\.js$/.test(url);
      })
    ).toBe(true);
    const react = await page.evaluate(() => {
      return Boolean(
        document.querySelector('[data-reactroot], #root') ||
        (window as unknown as { React?: unknown }).React
      );
    });
    expect(react).toBe(false);
    expect(problems).toEqual([]);
  });

  test('follows a floor stub to the other floor, and refits on resize', async ({
    page
  }) => {
    const problems = problemsOf(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/viewer.html`);
    await page
      .getByLabel('Diagram', { exact: true })
      .selectOption('two-floor-building');
    await waitForViewerSettled(page);
    const building = sample('two-floor-building');
    const marker = page.locator('[data-floor-stub]').first();
    await expect(marker).toContainText(building.views[1].name);
    await marker.click();
    await waitForViewerSettled(page);
    await expect(page.locator('[data-reticulyne-viewer]')).toHaveAttribute(
      'data-view',
      building.views[1].id
    );
    await expect(page.getByLabel('Floor', { exact: true })).toHaveValue(
      building.views[1].id
    );

    const before = await layerTransform(page);
    await page.setViewportSize({ width: 700, height: 500 });
    await expect
      .poll(() => {
        return layerTransform(page);
      })
      .not.toBe(before);
    expect(problems).toEqual([]);
  });

  test('Show more shows a long description in full', async ({ page }) => {
    const scene = sample('office-network');
    scene.objects[1].description = `<p>${'A long note about this firewall. '.repeat(12)}</p>`;
    await page.addInitScript(
      (config) => {
        (
          window as unknown as { __RETICULYNE_VIEWER_E2E__: unknown }
        ).__RETICULYNE_VIEWER_E2E__ = config;
      },
      { scene, options: {}, width: 1280, height: 800 }
    );
    await page.goto(`${BASE}/viewer.html`);
    await waitForViewerSettled(page);
    const label = page.locator(`[data-node-label="${scene.objects[1].id}"]`);
    // The drawing is hidden from screen readers (its outline names every
    // object, descriptions in full), so the button is found by its label.
    const button = label.locator('button[aria-label="Show more"]');
    await expect(button).toBeVisible();
    // The label's box is the button's parent.
    const box = label.locator('button').locator('xpath=..');
    const collapsed = await box.boundingBox();
    await button.click();
    await expect(label.locator('button[aria-label="Show less"]')).toBeVisible();
    const expanded = await box.boundingBox();
    expect(expanded!.height).toBeGreaterThan(collapsed!.height);
    await label.locator('button[aria-label="Show less"]').click();
    await expect(button).toBeVisible();
  });

  test('says what is wrong with a file that is not a diagram', async ({
    page
  }) => {
    await page.goto(`${BASE}/viewer.html`);
    await waitForViewerSettled(page);
    const chooser = page.waitForEvent('filechooser');
    await page.getByLabel('Diagram', { exact: true }).selectOption('file');
    await (
      await chooser
    ).setFiles({
      name: 'notes.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello": "world"}')
    });
    await expect(page.getByRole('alert')).toContainText(
      'Not a Reticulyne diagram'
    );
    await expect(page.locator('[data-reticulyne-viewer]')).toHaveCount(0);
  });

  test('draws a lean file, loading the built-in drawings it needs', async ({
    page
  }) => {
    const problems = problemsOf(page);
    const scene = sample('office-network');
    delete scene.icons;
    await page.goto(`${BASE}/viewer.html`);
    await waitForViewerSettled(page);
    const drawings = page.waitForRequest((request) => {
      return /\.js$/.test(request.url()) && !/viewer\./.test(request.url());
    });
    const chooser = page.waitForEvent('filechooser');
    await page.getByLabel('Diagram', { exact: true }).selectOption('file');
    await (
      await chooser
    ).setFiles({
      name: 'lean.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(scene))
    });
    await drawings;
    await waitForViewerSettled(page);
    const missing = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('[data-reticulyne-viewer] [data-node] img')
      ).filter((img) => {
        return decodeURIComponent(img.getAttribute('src') ?? '').includes(
          '>?</text>'
        );
      }).length;
    });
    expect(missing).toBe(0);
    expect(problems).toEqual([]);
  });
});
