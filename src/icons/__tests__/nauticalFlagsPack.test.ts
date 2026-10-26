import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packCatalogueItems, packMedia, validateIconPack } from '../pack';

// The Nautical Flags demo pack (packs/nautical-flags), built by
// scripts/build-pack.mjs. It is the pack the icon-pack tests use, so it is
// checked here as a third-party pack would be.

const file = join(
  __dirname,
  '../../../packs/nautical-flags/nautical-flags.reticulyne-pack.json'
);
const pack = JSON.parse(readFileSync(file, 'utf8'));

const FLAG_COLOURS = ['#FFFFFF', '#00247D', '#D6001C', '#FFD100', '#000000'];
// The staff and the outline: the library's ink and greys.
const STAFF_COLOURS = ['#16213d', '#c5cdda', '#e9edf3'];

const svgOf = (url: string) => {
  return decodeURIComponent(url.replace(/^data:image\/svg\+xml,/, ''));
};

test('passes validateIconPack', () => {
  expect(validateIconPack(pack).ok).toBe(true);
});

test('holds the 40 flags of the International Code of Signals', () => {
  expect(pack.icons).toHaveLength(40);
  expect(pack.icons[0].name).toBe('Alfa (A)');
  expect(pack.icons[25].name).toBe('Zulu (Z)');
  expect(pack.icons[39].name).toBe('Answering Pennant');
});

test('every flag has both drawings and connects by halyard', () => {
  expect(
    packMedia(pack).map((m) => {
      return m.id;
    })
  ).toEqual(['halyard']);
  for (const icon of pack.icons) {
    expect(icon.url).toMatch(/^data:image\/svg\+xml,/);
    expect(icon.flatUrl).toMatch(/^data:image\/svg\+xml,/);
    expect(
      icon.ports.map((p: { id: string; medium: string }) => {
        return `${p.id}:${p.medium}`;
      })
    ).toEqual(['hoist-top:halyard', 'hoist-bottom:halyard']);
  }
  expect(packCatalogueItems(pack)).toHaveLength(40);
});

test('the flags are drawn in the five flag colours only', () => {
  for (const icon of pack.icons) {
    for (const url of [icon.url, icon.flatUrl]) {
      const svg = svgOf(url);
      const start = svg.indexOf('<g clip-path');
      const face = svg.slice(start, svg.indexOf('</g>', start));
      const fills = [...face.matchAll(/fill="([^"]+)"/g)].map((m) => {
        return m[1];
      });
      const flag = fills.filter((f) => {
        return f !== 'none';
      });
      expect(flag.length).toBeGreaterThan(0);
      for (const fill of flag) expect(FLAG_COLOURS).toContain(fill);
      const all = [...svg.matchAll(/(?:fill|stroke)="(#[^"]+)"/g)].map((m) => {
        return m[1];
      });
      for (const colour of all) {
        expect([...FLAG_COLOURS, ...STAFF_COLOURS]).toContain(colour);
      }
    }
  }
});
