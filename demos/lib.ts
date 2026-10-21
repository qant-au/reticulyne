import { expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Helpers for the demo recordings. Everything here drives the editor through
 * its real UI (the icon library, drag and drop, the context menu, the
 * inspector) at a pace a viewer can follow, with a drawn cursor so the
 * recording shows where the pointer is.
 */

export type Tile = { x: number; y: number };

// An isometric tile at 100% zoom (src/utils/projection.ts).
const TILE_W = 141.42;
const TILE_H = 81.65;

// The editor's zoom, as a fraction; the zoom buttons keep tile (0, 0) at
// the centre of the viewport, which is where an empty diagram opens.
let zoom = 1;

/** Where tile (0, 0) sits on screen: the centre of the viewport. */
export const origin = (page: Page) => {
  const vp = page.viewportSize()!;
  return { x: vp.width / 2, y: vp.height / 2 };
};

/** Screen position of a tile's centre at the current zoom, iso projection. */
export const screenOf = (page: Page, tile: Tile): [number, number] => {
  const o = origin(page);
  return [
    o.x + zoom * (TILE_W / 2) * (tile.x - tile.y),
    o.y - zoom * (TILE_H / 2) * (tile.x + tile.y)
  ];
};

/** Zoom out with the toolbar button, `times` steps of 20%. */
export const zoomOut = async (page: Page, times = 1) => {
  const button = page.getByRole('button', { name: /^Zoom out/ });
  const box = (await button.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 400);
  for (let i = 0; i < times; i += 1) {
    await button.click();
    await pause(page, 250);
  }
  const text = await page.locator('text=/^[0-9]+%$/').first().textContent();
  zoom = Number((text ?? '100').replace('%', '')) / 100;
};

/** Rename the selected object in its inspector (the first field, Name). */
export const rename = async (page: Page, name: string) => {
  // The inspector's first text field is the object's name.
  const field = page.getByRole('textbox').first();
  await expect(field).toBeVisible();
  const box = (await field.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 300);
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(name, { delay: 30 });
  await pause(page, 250);
  await page.keyboard.press('Escape');
};

/** Place a catalogue item and give it a name of its own. */
export const placeAs = async (
  page: Page,
  item: string,
  name: string,
  tile: Tile,
  search = item
) => {
  await place(page, item, tile, search);
  // Select it on the canvas: its inspector opens with the Name field.
  await glide(page, screenOf(page, tile), 350);
  await page.mouse.click(...screenOf(page, tile));
  await pause(page, 250);
  await rename(page, name);
};

/** Switch between the isometric and the flat view with the toolbar. */
export const toView = async (page: Page, view: 'iso' | 'flat') => {
  const button = page.getByRole('button', {
    name: view === 'iso' ? 'Isometric view' : 'Flat 2D view',
    exact: true
  });
  const box = (await button.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 400);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
};

export const pause = (page: Page, ms: number) => {
  return page.waitForTimeout(ms);
};

/** A drawn cursor that follows the real pointer, so the video shows it. */
export const installCursor = async (page: Page) => {
  await page.addInitScript(() => {
    const ready = () => {
      const el = document.createElement('div');
      el.id = '__demo-cursor';
      el.style.cssText =
        'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;' +
        'pointer-events:none;transform:translate(-4px,-3px);transition:none;' +
        'filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45))';
      el.innerHTML =
        '<svg viewBox="0 0 28 28" width="28" height="28"><path d="M6 3 L6 22 L11 17.5 L14.5 25 L17.5 23.6 L14 16.2 L21 16 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      const ring = document.createElement('div');
      ring.id = '__demo-ring';
      ring.style.cssText =
        'position:fixed;left:0;top:0;width:34px;height:34px;border-radius:50%;' +
        'border:3px solid rgba(46,168,142,.9);z-index:2147483646;pointer-events:none;' +
        'transform:translate(-17px,-17px) scale(.4);opacity:0;transition:transform .25s ease-out,opacity .25s ease-out';
      document.body.append(el, ring);
      let x = 0;
      let y = 0;
      const place = () => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
      };
      window.addEventListener(
        'pointermove',
        (e) => {
          x = e.clientX;
          y = e.clientY;
          place();
        },
        true
      );
      window.addEventListener(
        'pointerdown',
        (e) => {
          x = e.clientX;
          y = e.clientY;
          place();
          ring.style.transition = 'none';
          ring.style.transform = 'translate(-17px,-17px) scale(.4)';
          ring.style.opacity = '1';
          requestAnimationFrame(() => {
            ring.style.transition =
              'transform .3s ease-out,opacity .3s ease-out';
            ring.style.transform = 'translate(-17px,-17px) scale(1.1)';
            ring.style.opacity = '0';
          });
        },
        true
      );
    };
    if (document.body) ready();
    else document.addEventListener('DOMContentLoaded', ready);
  });
};

/** Move the pointer from where it is to (x, y) over `ms`, like a hand would. */
export const glide = async (
  page: Page,
  to: [number, number],
  ms = 500
) => {
  const from = await page.evaluate(() => {
    const el = document.getElementById('__demo-cursor');
    return el
      ? { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 }
      : { x: 0, y: 0 };
  });
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i += 1) {
    // Ease in and out so the motion reads as deliberate.
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await page.mouse.move(
      from.x + (to[0] - from.x) * e,
      from.y + (to[1] - from.y) * e
    );
    await page.waitForTimeout(ms / steps);
  }
};

export const openLibrary = async (page: Page) => {
  const palette = page.getByTestId('icon-palette');
  if (await palette.getByRole('textbox').isVisible().catch(() => false)) {
    return palette;
  }
  const button = page.getByRole('button', { name: 'Icon library', exact: true });
  const box = (await button.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 350);
  await button.click();
  await expect(palette).toBeVisible();
  return palette;
};

/**
 * Drag a catalogue item from the library onto a tile. `name` is the item's
 * catalogue name; its tile in the library is named "Icon <name> <name>".
 */
export const place = async (
  page: Page,
  name: string,
  tile: Tile,
  search = name,
  keepSelected = false
) => {
  const palette = await openLibrary(page);
  const box = palette.getByRole('textbox');
  await box.click();
  await box.fill('');
  await page.keyboard.type(search, { delay: 35 });
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const item = palette
    .getByTestId('catalogue-items')
    .getByRole('button', { name: new RegExp(`^Icon ${escaped} ${escaped}$`) })
    .first();
  await expect(item).toBeVisible();
  const from = (await item.boundingBox())!;
  await glide(page, [from.x + from.width / 2, from.y + from.height / 2], 350);
  await pause(page, 120);
  await page.mouse.down();
  await glide(page, screenOf(page, tile), 650);
  await pause(page, 80);
  await page.mouse.up();
  await pause(page, 250);
  if (!keepSelected) await page.keyboard.press('Escape');
};

const canvas = (page: Page) => {
  return page.getByRole('application');
};

/** The node image of the object with this name, as drawn on the canvas. */
export const nodeImage = (page: Page, name: string) => {
  return canvas(page)
    .getByText(name, { exact: true })
    .first()
    .locator('xpath=ancestor::*[.//img][1]//img')
    .first();
};

/**
 * Connect two placed objects from the first one's context menu ("Connect
 * to…"), the way the keyboard route does it. The connection takes the first
 * free port on each side on a medium they share.
 */
export const connect = async (
  page: Page,
  from: Tile,
  toName: string,
  opts: { fromPortOf?: string; fromPort?: string; toPort?: string } = {}
) => {
  await glide(page, screenOf(page, from), 450);
  await pause(page, 100);
  await page.mouse.click(...screenOf(page, from), { button: 'right' });
  const item = page.getByRole('menuitem', { name: 'Connect to…' });
  const box = (await item.boundingBox())!;
  await glide(page, [box.x + 24, box.y + box.height / 2], 300);
  await item.click();
  const dialog = page.getByRole('dialog', { name: /Connect .* to/ });
  await expect(dialog).toBeVisible();
  const combo = dialog.getByRole('combobox');
  await combo.click();
  await page.keyboard.type(toName, { delay: 35 });
  const option = page.getByRole('option', { name: toName }).first();
  await expect(option).toBeVisible();
  await pause(page, 150);
  await option.click();
  const button = dialog.getByRole('button', { name: 'Connect' });
  const bb = (await button.boundingBox())!;
  await glide(page, [bb.x + bb.width / 2, bb.y + bb.height / 2], 300);
  await button.click();
  await expect(dialog).toHaveCount(0);
  await pause(page, 200);
  // The new connector is selected and its inspector is open: fix a port
  // where the first free one is not the right one.
  if (opts.fromPort && opts.fromPortOf) {
    await choosePort(page, opts.fromPortOf, opts.fromPort);
  }
  if (opts.toPort) await choosePort(page, toName, opts.toPort);
  await pause(page, 300);
  await page.keyboard.press('Escape');
};

/** In the selected connector's Ports section, pick a port for one end. */
export const choosePort = async (page: Page, itemName: string, port: string) => {
  const section = page.getByTestId('connection-ports');
  const select = section.getByRole('combobox', { name: itemName });
  const box = (await select.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 350);
  await select.click();
  // Options read "LAN 1 (ethernet-copper)": the port name, then its medium.
  const escaped = port.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const option = page.getByRole('option', { name: new RegExp(`^${escaped} \\(`) });
  const ob = (await option.boundingBox())!;
  await glide(page, [ob.x + 24, ob.y + ob.height / 2], 300);
  await option.click();
  await pause(page, 350);
};

export const fitToView = async (page: Page) => {
  await page.keyboard.press('Escape');
  const button = page.getByRole('button', { name: /^Fit to view/ });
  const box = (await button.boundingBox())!;
  await glide(page, [box.x + box.width / 2, box.y + box.height / 2], 400);
  await button.click();
};

/** Export the diagram as a scene (JSON) through the main menu. */
export const exportScene = async (page: Page) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Main menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Export as JSON/i }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  await page.keyboard.press('Escape');
  return JSON.parse(text) as Scene;
};

export interface Scene {
  format: string;
  version: number;
  id: string;
  title?: string;
  objects: { id: string; name?: string; [k: string]: unknown }[];
  connections?: {
    id: string;
    from: string;
    to: string;
    fromPort?: string;
    toPort?: string;
    [k: string]: unknown;
  }[];
  views: {
    id: string;
    placements?: { object: string; [k: string]: unknown }[];
    connectors?: {
      id: string;
      connection?: string;
      anchors: { id: string; ref: Record<string, unknown> }[];
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}

const slug = (s: string) => {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Give the exported scene readable ids: objects by `ids[name]`, connections
 * and connectors by their two ends. The editor's generated ids mean nothing
 * to a reader of the scene or of the example that drives it.
 */
export const tidyIds = (scene: Scene, ids: Record<string, string>) => {
  const objectId = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const object of scene.objects) {
    const base = ids[object.name ?? ''] ?? slug(object.name ?? object.id);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    objectId.set(object.id, n === 1 ? base : `${base}-${n}`);
  }
  const o = (id: string) => {
    return objectId.get(id) ?? id;
  };
  const connectionId = new Map<string, string>();
  for (const c of scene.connections ?? []) {
    const base = `${o(c.from)}--${o(c.to)}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    connectionId.set(c.id, n === 1 ? base : `${base}-${n}`);
  }
  const cid = (id: string) => {
    return connectionId.get(id) ?? id;
  };
  scene.objects = scene.objects.map((x) => {
    return { ...x, id: o(x.id) };
  });
  scene.connections = (scene.connections ?? []).map((c) => {
    return { ...c, id: cid(c.id), from: o(c.from), to: o(c.to) };
  });
  scene.views = scene.views.map((view) => {
    return {
      ...view,
      placements: (view.placements ?? []).map((p) => {
        return { ...p, object: o(p.object) };
      }),
      connectors: (view.connectors ?? []).map((k) => {
        return {
          ...k,
          id: k.connection ? cid(k.connection) : k.id,
          connection: k.connection ? cid(k.connection) : undefined,
          anchors: k.anchors.map((a, i) => {
            return {
              id: `${k.connection ? cid(k.connection) : k.id}-${i + 1}`,
              ref:
                typeof a.ref.object === 'string'
                  ? { ...a.ref, object: o(a.ref.object) }
                  : a.ref
            };
          })
        };
      })
    };
  });
  return scene;
};

export const saveScene = async (scene: Scene, file: string) => {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(scene, null, 2)}\n`);
};

/** Keep the recording as demos/out/<name>.webm for encode.mjs. */
export const saveVideo = async (page: Page, testInfo: TestInfo, name: string) => {
  const video = page.video();
  await page.close();
  if (!video) throw new Error('no video recorded');
  const out = join(__dirname, 'out', `${name}.webm`);
  await mkdir(dirname(out), { recursive: true });
  await video.saveAs(out);
  testInfo.attachments.push({ name, path: out, contentType: 'video/webm' });
};

/** Start the editor on an empty diagram with the given title. */
export const startEmpty = async (page: Page, id: string, title: string) => {
  await installCursor(page);
  await page.addInitScript(
    (data) => {
      (window as unknown as { __RETICULYNE_E2E__: unknown }).__RETICULYNE_E2E__ =
        { initialData: data };
    },
    {
      format: 'reticulyne-scene',
      version: 2,
      id,
      title,
      objects: [],
      views: [{ id: 'main', kind: 'iso', name: 'Main', placements: [] }]
    }
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/Reticulyne/);
  const o = origin(page);
  await page.mouse.move(o.x, o.y);
  await pause(page, 800);
};
