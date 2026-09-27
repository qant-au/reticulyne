/**
 * @jest-environment jsdom
 */
import {
  CUSTOM_ICON_COLLECTION,
  iconNameFromFile,
  readIconAsDataUrl
} from '../iconUpload';
import { filterIconsByCollection } from '../common';

// ROADMAP 2.13.
const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';

describe('readIconAsDataUrl', () => {
  test('embeds an SVG as a data: URL named after the file', async () => {
    const file = new File([svg], 'db-server.svg', { type: 'image/svg+xml' });
    const { url, name } = await readIconAsDataUrl(file);
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    expect(name).toBe('db-server');
  });

  test('refuses a non-image', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    await expect(readIconAsDataUrl(file)).rejects.toThrow(/SVG, PNG/);
  });

  test('refuses an image too large to embed', async () => {
    const big = new File(['x'.repeat(60_000)], 'big.png', {
      type: 'image/png'
    });
    await expect(readIconAsDataUrl(big)).rejects.toThrow(/too large/);
  });
});

test('iconNameFromFile strips the extension', () => {
  expect(iconNameFromFile(new File([''], 'a.b.png'))).toBe('a.b');
});

test('an allow-list of packs keeps uploaded icons; a deny drops them', () => {
  const icons = [
    { id: '1', name: 'a', url: 'a.svg', collection: 'aws' },
    { id: '2', name: 'b', url: 'b.svg', collection: 'gcp' },
    { id: '3', name: 'c', url: 'c.svg', collection: CUSTOM_ICON_COLLECTION }
  ];
  expect(
    filterIconsByCollection(icons, { allow: ['aws'] }).map((i) => {
      return i.id;
    })
  ).toEqual(['1', '3']);
  expect(
    filterIconsByCollection(icons, { deny: [CUSTOM_ICON_COLLECTION] }).map(
      (i) => {
        return i.id;
      }
    )
  ).toEqual(['1', '2']);
});
