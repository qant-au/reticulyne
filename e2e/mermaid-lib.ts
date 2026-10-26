import type { Page } from '@playwright/test';

// Real Mermaid in a blank page, for checking what Reticulyne writes and
// reads against what Mermaid itself makes of it. Mermaid is a dev
// dependency only: 12.1.0 as `mermaid`, 11.17.2 as `mermaid11`.
export const MERMAID_VERSIONS = ['mermaid', 'mermaid11'] as const;
export type MermaidPackage = (typeof MERMAID_VERSIONS)[number];

export const withMermaid = async (page: Page, pkg: MermaidPackage) => {
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({
    path: require.resolve(`${pkg}/dist/mermaid.min.js`)
  });
  await page.evaluate(() => {
    (
      window as unknown as { mermaid: { initialize: (c: object) => void } }
    ).mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict'
    });
  });
};

/** Mermaid's verdict on `text`: null when it parses, else its message. */
export const mermaidParse = async (page: Page, text: string) => {
  return page.evaluate(async (t) => {
    const m = (
      window as unknown as {
        mermaid: { parse: (t: string) => Promise<unknown> };
      }
    ).mermaid;
    try {
      await m.parse(t);
      return null;
    } catch (e) {
      return String((e as Error)?.message ?? e).slice(0, 300);
    }
  }, text);
};

/** Mermaid's SVG for `text`, or the error it threw. */
export const mermaidRender = async (page: Page, text: string) => {
  return page.evaluate(async (t) => {
    const m = (
      window as unknown as {
        mermaid: {
          render: (id: string, t: string) => Promise<{ svg: string }>;
        };
      }
    ).mermaid;
    try {
      const { svg } = await m.render(
        `m${Math.random().toString(36).slice(2)}`,
        t
      );
      return { svg, error: null };
    } catch (e) {
      return {
        svg: '',
        error: String((e as Error)?.message ?? e).slice(0, 300)
      };
    }
  }, text);
};
