import { expect, test, Page } from '@playwright/test';

/**
 * The title bar: "<title> > <floors> <save status>". Nothing truncates while
 * there is room; when there is not, the title gives way first, then the
 * floors, and the save status never wraps (sweep 2026-09-30, round 3).
 */
const EXAMPLES = process.env.RETICULYNE_EXAMPLES_BASE_URL ?? 'http://localhost:2223';

type Fixture = {
  title: string;
  views: { id: string; name: string }[];
  save?: boolean;
};

const open = async (page: Page, width: number, height: number, f: Fixture) => {
  await page.setViewportSize({ width, height });
  await page.addInitScript((fx) => {
    (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
      {
        editorMode: 'EDITABLE',
        ...(fx.save ? { save: { autoSaveDebounce: false } } : {}),
        initialData: {
          title: fx.title,
          items: [{ id: 'a', name: 'Router' }],
          icons: [],
          colors: [],
          views: fx.views.map((v, i) => {
            return {
              ...v,
              items: i === 0 ? [{ id: 'a', tile: { x: 0, y: 0 } }] : []
            };
          })
        }
      };
  }, f);
  await page.goto('/');
  await expect(page.getByTestId('title-bar')).toBeVisible();
};

type Layout = {
  titleCut: boolean;
  titleWidth: number;
  titleMin: number;
  chipCut: boolean;
  statusLines: number;
};

// What is cut, and whether the title was at its minimum when the floors
// were.
const layout = async (page: Page): Promise<Layout> => {
  return page.getByTestId('title-bar').evaluate((bar) => {
    const title = bar.querySelector('[data-testid="title-bar-title"]')!;
    const cut = (el: Element | null) => {
      return !!el && el.scrollWidth > el.clientWidth;
    };
    const active =
      bar.querySelector('[role="tab"][aria-selected="true"] span') ??
      bar.querySelector('[role="tab"] span');
    const status = bar.querySelector('[data-testid="save-status"] p');
    const lineHeight = status
      ? parseFloat(getComputedStyle(status).lineHeight) || 20
      : 20;
    const fontSize = parseFloat(getComputedStyle(title).fontSize);
    return {
      titleCut: cut(title),
      titleWidth: title.clientWidth,
      titleMin: 3 * fontSize,
      chipCut: cut(active),
      statusLines: status
        ? Math.round(status.getBoundingClientRect().height / lineHeight)
        : 0
    };
  });
};

const expectOrder = (l: Layout) => {
  // The floors give way only once the title is at its minimum.
  if (l.chipCut) expect(l.titleWidth).toBeLessThanOrEqual(l.titleMin + 2);
  expect(l.statusLines).toBeLessThanOrEqual(1);
};

for (const [width, height] of [
  [1440, 900],
  [390, 844]
] as const) {
  // (a) "up > M..." with room to spare.
  test(`(a) at ${width} a short title and the view chip are both in full`, async ({
    page
  }) => {
    await open(page, width, height, {
      title: 'up',
      views: [{ id: 'v', name: 'Main' }]
    });
    const l = await layout(page);
    expect(l.titleCut).toBe(false);
    expect(l.chipCut).toBe(false);
    await open(page, width, height, {
      title: 'Untitled',
      views: [{ id: 'v', name: 'Untitled' }]
    });
    const u = await layout(page);
    expect(u.titleCut).toBe(false);
    expect(u.chipCut).toBe(false);
  });

  // (b) "Gr..." while the title showed in full.
  test(`(b) at ${width} the shown floor keeps its name before the title does`, async ({
    page
  }) => {
    await open(page, width, height, {
      title: 'Sweep B building',
      views: [
        { id: 'g', name: 'Ground net' },
        { id: 'l1', name: 'Level 1 net' }
      ]
    });
    const l = await layout(page);
    expectOrder(l);
    if (width === 1440) {
      expect(l.titleCut).toBe(false);
      expect(l.chipCut).toBe(false);
    } else {
      // A phone: no room for all of it, and the title gave way first.
      expect(l.titleCut).toBe(true);
    }
  });

  // (d) "Unsaved changes" wrapped to two lines while the title shrank.
  test(`(d) at ${width} the save status stays on one line`, async ({ page }) => {
    await open(page, width, height, {
      title: 'Sweep diagram title',
      views: [{ id: 'v', name: 'Schematic' }],
      save: true
    });
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('menuitem', { name: 'Rename diagram' }).click();
    await page.getByLabel('Title').fill('Sweep diagram retitled');
    await page.getByLabel('Title').press('Enter');
    const pill = page.getByTestId('save-status');
    await expect(pill).toContainText(
      width < 600 ? 'Unsaved' : 'Unsaved changes'
    );
    const l = await layout(page);
    expectOrder(l);
    expect(l.chipCut).toBe(false);
  });
}

// (c) Beside the examples picker at 1440 the bar was 298px wide and the
// title "Airport manage..." with empty canvas beside it.
for (const [width, height] of [
  [1440, 900],
  [390, 844]
] as const) {
  test(`(c) at ${width} the examples title bar uses the room it has`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(EXAMPLES);
    await expect(page.getByTestId('title-bar')).toBeVisible({ timeout: 20000 });
    const l = await layout(page);
    expectOrder(l);
    expect(l.chipCut).toBe(false);
    if (width === 1440) expect(l.titleCut).toBe(false);
  });
}

// Sweep 2026-09-30, round 4.
const rename = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Rename diagram' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Title').press('Enter');
};

// At 390 the floor tabs ran on under the options, + and eye buttons ("Lab"
// a sliver, "First flo" with no ellipsis) while the shown floor read "Gr...".
test('at 390 the floor tabs stay in their own space, cut only with an ellipsis, the shown one last', async ({
  page
}) => {
  await open(page, 390, 844, {
    title: 'Sweep B building',
    views: [
      { id: 'g', name: 'Ground net' },
      { id: 'f', name: 'First floor' },
      { id: 'l', name: 'Lab' }
    ],
    save: true
  });
  await rename(page, 'Sweep B building two');
  await expect(page.getByTestId('save-status')).toBeVisible();
  const r = await page.getByTestId('floor-switcher').evaluate((sw) => {
    const scroller = sw.firstElementChild as HTMLElement;
    const s = scroller.getBoundingClientRect();
    const buttons = [...sw.querySelectorAll('button')].filter((b) => {
      return !scroller.contains(b);
    });
    const firstButton = Math.min(
      ...buttons.map((b) => {
        return b.getBoundingClientRect().left;
      })
    );
    const tabs = [...scroller.querySelectorAll('[role="tab"]')].map((t) => {
      const b = t.getBoundingClientRect();
      const span = t.querySelector('span')!;
      return {
        active: t.getAttribute('aria-selected') === 'true',
        left: b.left,
        right: b.right,
        cut: span.scrollWidth > span.clientWidth,
        ellipsis: getComputedStyle(span).textOverflow === 'ellipsis'
      };
    });
    return { s: { left: s.left, right: s.right }, firstButton, tabs };
  });
  expect(r.tabs.length).toBeGreaterThan(0);
  for (const t of r.tabs) {
    // Wholly inside the tab list, and the list clear of the buttons.
    expect(t.left).toBeGreaterThanOrEqual(r.s.left - 1);
    expect(t.right).toBeLessThanOrEqual(r.s.right + 1);
    if (t.cut) expect(t.ellipsis).toBe(true);
  }
  expect(r.s.right).toBeLessThanOrEqual(r.firstButton + 1);
  const active = r.tabs.find((t) => {
    return t.active;
  })!;
  if (active.cut) {
    for (const t of r.tabs) expect(t.cut).toBe(true);
  }
  // Every floor is still one tap or two away.
  if (r.tabs.length < 3) {
    await page.getByRole('button', { name: 'Floor options' }).click();
    for (const name of ['Ground net', 'First floor', 'Lab']) {
      await expect(page.getByRole('menuitem', { name })).toBeVisible();
    }
    await page.getByRole('menuitem', { name: 'Lab' }).click();
    await expect(page.getByRole('tab', { name: 'Lab' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  }
});

// At 390 the bar stopped at 276px (x57-333) under a zoom row spanning
// x41-363, the title cut with ~30px unused.
test('at 390 a long title uses the width of the row below', async ({ page }) => {
  await open(page, 390, 844, {
    title: 'Sweep diagram with a long enough title',
    views: [{ id: 'v', name: 'Main' }]
  });
  const bar = await page.getByTestId('title-bar').evaluate((el) => {
    const b = el.parentElement!.getBoundingClientRect();
    return { left: b.left, right: b.right };
  });
  expect(bar.left).toBeLessThanOrEqual(41);
  expect(bar.right).toBeGreaterThanOrEqual(358);
});

// The compact status carried its full wording only in a native title: a tap
// showed nothing and assistive tech read the short word.
test.describe('on a touch phone', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('a tap on the save status shows its full wording, which is also its text', async ({
    page
  }) => {
    await open(page, 390, 844, {
      title: 'Sweep',
      views: [{ id: 'v', name: 'Main' }],
      save: true
    });
    await rename(page, 'Sweep two');
    const pill = page.getByTestId('save-status');
    await expect(pill.locator('[aria-hidden]')).toHaveText('Unsaved');
    await expect(pill).toContainText('Unsaved changes');
    await pill.tap();
    await expect(page.getByRole('tooltip')).toHaveText('Unsaved changes');
  });
});

// At 1440 the bar sat at ~824px, midway between the left controls and the
// mini-map, not under the Diagrams button at the canvas centre.
test('at 1440 a bar that fits is centred on the canvas', async ({ page }) => {
  await open(page, 1440, 900, {
    title: 'up',
    views: [{ id: 'v', name: 'Main' }]
  });
  const centre = await page.getByTestId('title-bar').evaluate((el) => {
    const b = el.parentElement!.getBoundingClientRect();
    return b.left + b.width / 2;
  });
  expect(Math.abs(centre - 720)).toBeLessThanOrEqual(2);
});
