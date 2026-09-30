import { clamp, connectorsFirst, repositoryWebUrl } from '../common';

describe('Tests common utilities', () => {
  test('clamp() works correctly', () => {
    const clampNoChange = clamp(5, 0, 10);
    const clampMin = clamp(5, 6, 10);
    const clampMax = clamp(5, 0, 3);
    const clampDraw1 = clamp(5, 5, 10);
    const clampDraw2 = clamp(5, 0, 5);

    expect(clampNoChange).toBe(5);
    expect(clampMin).toBe(6);
    expect(clampMax).toBe(3);
    expect(clampDraw1).toBe(5);
    expect(clampDraw2).toBe(5);
  });

  test('connectorsFirst() puts connectors ahead of everything else', () => {
    const ordered = connectorsFirst([
      { type: 'ITEM', id: 'n3' },
      { type: 'CONNECTOR', id: 'k3' },
      { type: 'ITEM', id: 'n5' }
    ]);

    expect(
      ordered.map((i) => {
        return i.id;
      })
    ).toEqual(['k3', 'n3', 'n5']);
  });
});

// Sweep 2026-09-30 (E24): Main menu > GitHub opened package.json's
// git+https://...git, which no browser opens as a page.
describe('repositoryWebUrl', () => {
  test('npm repository urls become the web page', () => {
    expect(
      repositoryWebUrl('git+https://github.com/qant-au/reticulyne.git')
    ).toBe('https://github.com/qant-au/reticulyne');
    expect(repositoryWebUrl('git://github.com/qant-au/reticulyne.git')).toBe(
      'https://github.com/qant-au/reticulyne'
    );
    expect(repositoryWebUrl('git@github.com:qant-au/reticulyne.git')).toBe(
      'https://github.com/qant-au/reticulyne'
    );
    expect(repositoryWebUrl('https://github.com/qant-au/reticulyne')).toBe(
      'https://github.com/qant-au/reticulyne'
    );
  });

  test("the package's own url", () => {
    expect(repositoryWebUrl(REPOSITORY_URL)).toBe(
      'https://github.com/qant-au/reticulyne'
    );
  });
});
