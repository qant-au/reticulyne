#!/usr/bin/env node
// Turns the recorded demos (demos/out/*.webm) into the GIFs in docs/demos.
//
//   node demos/encode.mjs            # every recording in demos/out
//   node demos/encode.mjs office-network nmea-2000
//
// Needs ffmpeg on PATH, and uses gifsicle when it is there. Each GIF is played back faster than real time
// (SPEED), at FPS frames a second and WIDTH pixels wide, with a palette
// built from the recording itself so the editor's flat colours stay crisp.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const IN = join(here, 'out');
const OUT = join(here, '..', 'docs', 'demos');

// Per-recording settings: how much to speed it up, and where to cut.
const SETTINGS = {
  'office-network': { speed: 3, start: 1.2 },
  'nmea-2000': { speed: 3, start: 1.2 },
  'office-live': { speed: 1, start: 1.5 }
};
const FPS = 10;
const WIDTH = 800;

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(IN)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => f.replace(/\.webm$/, ''));

for (const name of names) {
  const src = join(IN, `${name}.webm`);
  if (!existsSync(src)) {
    console.error(`no recording: ${src}`);
    process.exitCode = 1;
    continue;
  }
  const { speed = 2, start = 0, end } = SETTINGS[name] ?? {};
  const out = join(OUT, `${name}.gif`);
  const filters = [
    `setpts=PTS/${speed}`,
    `fps=${FPS}`,
    `scale=${WIDTH}:-1:flags=area`,
    // Temporal denoise: the recording's codec noise would otherwise make
    // every frame a full redraw after quantisation.
    'hqdn3d=2:1:20:12',
    'split[a][b]',
    '[a]palettegen=max_colors=96:stats_mode=diff[p]',
    '[b][p]paletteuse=dither=none:diff_mode=rectangle'
  ].join(',');
  const args = ['-v', 'error', '-y', '-ss', String(start), '-i', src];
  if (end) args.push('-to', String(end));
  args.push('-filter_complex', filters, '-loop', '0', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  // gifsicle, when installed, takes a GIF of this kind down to a third of
  // the size with no visible change; the editor's flat colours survive
  // lossy LZW well.
  try {
    execFileSync('gifsicle', ['-O3', '--lossy=60', '-o', out, out], { stdio: 'inherit' });
  } catch {
    console.warn('gifsicle not found: GIF left unoptimised');
  }
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`${out}  ${kb} KB`);
}
