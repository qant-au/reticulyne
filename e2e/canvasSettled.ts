import { Page } from '@playwright/test';

/**
 * Waits until the canvas has finished its first layout, so a click at a
 * viewport position lands on what the test means it to.
 *
 * Straight after load two things still move: a node's icon draws at half
 * size until its image has loaded, and a scene layer is still being
 * positioned, so a node can shift by 25 px or so within ~400 ms. A test
 * that clicks at the centre in that window hits empty canvas, or the wrong
 * tile, now and then.
 *
 * Settled means: the canvas is there, every icon image on screen has loaded
 * and has a size, and nothing in the canvas has moved for `frames`
 * animation frames in a row.
 */
export const waitForCanvasSettled = async (page: Page, frames = 3) => {
  await page.waitForSelector('[role="application"]');
  await page.waitForFunction(
    (need) => {
      const app = document.querySelector('[role="application"]');
      if (!app) return false;
      const w = window as unknown as {
        __canvasSettled?: { last: string; same: number };
      };
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
      };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const imgs = Array.from(app.querySelectorAll('img')).filter((img) => {
        // Lazy images off screen never load; only the visible ones matter.
        const r = img.getBoundingClientRect();
        return r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
      });
      const loaded = imgs.every((img) => {
        return img.complete && img.naturalWidth > 0;
      });
      const layers = Array.from(app.querySelectorAll(':scope svg, :scope img'));
      const now = layers.map(box).join('|');
      const prev = w.__canvasSettled;
      const same = loaded && prev && prev.last === now ? prev.same + 1 : 0;
      w.__canvasSettled = { last: now, same };
      if (same >= need) {
        delete w.__canvasSettled;
        return true;
      }
      return false;
    },
    frames,
    { polling: 'raf' }
  );
};
