import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for recording the demo GIFs in docs/demos.
 *
 * Each demo is a `*.demo.ts` script that drives the editor the way a person
 * would and records the session as a video; `demos/encode.mjs` turns the
 * videos into GIFs. The editor comes from the Docker containers that
 * `bash restart.sh` starts: the editor on http://localhost:2222 and the
 * examples picker on http://localhost:2223.
 *
 *   npm run demos:record     # records every demo (one at a time)
 *   npm run demos:encode     # webm -> gif
 */
export const VIEWPORT = { width: 1200, height: 750 };

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.demo\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60 * 1000,
  reporter: 'list',
  outputDir: '../playwright-out/demos',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:2222',
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    video: { mode: 'on', size: VIEWPORT },
    trace: 'off',
    screenshot: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: 1
      }
    }
  ]
});
