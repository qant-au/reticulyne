import {
  describeRef,
  describeSelection,
  freeTileNear,
  keyboardStops,
  plainText,
  stopIndex
} from '../accessibility';
import { getTilePosition } from '../coordinates';
import type { ModelItem, View } from 'src/types';

// The order Tab walks the objects in, and what is read out.

const view: View = {
  id: 'v',
  name: 'V',
  items: [
    { id: 'a', tile: { x: 0, y: 0 } },
    { id: 'b', tile: { x: 4, y: 0 } },
    { id: 'c', tile: { x: 0, y: 4 } },
    { id: 'locked', tile: { x: 2, y: 2 }, locked: true }
  ],
  connectors: [
    {
      id: 'ab',
      description: 'uplink',
      anchors: [
        { id: 'x', ref: { item: 'a' } },
        { id: 'y', ref: { item: 'b' } }
      ]
    }
  ],
  textBoxes: [{ id: 't', tile: { x: 1, y: 1 }, content: 'Core' }],
  rectangles: [{ id: 'r', from: { x: -2, y: -2 }, to: { x: 0, y: 0 } }]
};

const modelItems: ModelItem[] = [
  {
    id: 'a',
    name: 'Router',
    icon: 'router',
    description: '<p>Edge <b>router</b></p>'
  },
  { id: 'b', name: 'Switch' },
  { id: 'c', name: 'Server' }
];

const ctx = {
  view,
  modelItems,
  icons: [{ id: 'router', name: 'Cisco router', url: 'x' }]
};

describe('keyboardStops', () => {
  const stops = keyboardStops(view, view);

  test('shapes in reading order, then connectors; locked left out', () => {
    const keys = stops.map((s) => {
      return s.key;
    });
    expect(keys).not.toContain('ITEM:locked');
    expect(keys[keys.length - 1]).toBe('CONNECTOR:ab');
    const shapes = stops.slice(0, -1).map((s) => {
      return getTilePosition({ tile: s.tile });
    });
    for (let i = 1; i < shapes.length; i += 1) {
      const before = shapes[i - 1];
      const now = shapes[i];
      expect(
        before.y < now.y || (before.y === now.y && before.x <= now.x)
      ).toBe(true);
    }
    expect(keys).toHaveLength(6);
  });

  test('stopIndex finds the stop a selection is, or -1', () => {
    expect(stopIndex(stops, [{ type: 'ITEM', id: 'c' }])).toBe(
      stops.findIndex((s) => {
        return s.key === 'ITEM:c';
      })
    );
    expect(stopIndex(stops, [])).toBe(-1);
    expect(
      stopIndex(stops, [
        { type: 'ITEM', id: 'a' },
        { type: 'ITEM', id: 'b' }
      ])
    ).toBe(-1);
  });
});

describe('describing objects', () => {
  test('a node: name, icon, plain description, what it connects to', () => {
    expect(describeRef(ctx, { type: 'ITEM', id: 'a' })).toBe(
      'Router, Cisco router. Edge router. Connected to Switch'
    );
    expect(describeRef(ctx, { type: 'ITEM', id: 'c' })).toBe('Server');
  });

  test('a connector names both ends and its label', () => {
    expect(describeRef(ctx, { type: 'CONNECTOR', id: 'ab' })).toBe(
      'Connector from Router to Switch. uplink'
    );
  });

  test('a text box and a rectangle', () => {
    expect(describeRef(ctx, { type: 'TEXTBOX', id: 't' })).toBe('Text: Core');
    expect(describeRef(ctx, { type: 'RECTANGLE', id: 'r' })).toBe('Rectangle');
  });

  test('a selection says where it is in the Tab order', () => {
    const stops = keyboardStops(view, view);
    const text = describeSelection(ctx, stops, [{ type: 'ITEM', id: 'b' }]);
    expect(text).toMatch(/^Switch\. Connected to Router\. \d of 6$/);
    expect(
      describeSelection(ctx, stops, [
        { type: 'ITEM', id: 'a' },
        { type: 'ITEM', id: 'b' }
      ])
    ).toBe('2 objects selected');
    expect(describeSelection(ctx, stops, [])).toBe('Nothing selected');
  });
});

describe('helpers', () => {
  test('plainText strips markup and shortens', () => {
    expect(plainText('<p>a &amp; b</p><p>c</p>')).toBe('a & b c');
    expect(plainText('x'.repeat(300), 10)).toHaveLength(10);
    expect(plainText('<p>&amp;lt;b&amp;gt;</p>')).toBe('&lt;b&gt;');
  });

  test('freeTileNear skips tiles a node holds, and the tiles around them', () => {
    expect(freeTileNear(view, { x: 9, y: 9 })).toEqual({ x: 9, y: 9 });
    const free = freeTileNear(view, { x: 0, y: 0 });
    // A neighbour of a node would put the new label on top of its label.
    for (const item of view.items) {
      expect(
        Math.max(Math.abs(free.x - item.tile.x), Math.abs(free.y - item.tile.y))
      ).toBeGreaterThanOrEqual(2);
    }
  });

  test('freeTileNear falls back to any free tile when none is clear', () => {
    const items = [];
    for (let x = -70; x <= 70; x += 2) {
      for (let y = -70; y <= 70; y += 2) {
        items.push({ id: `n${x},${y}`, tile: { x, y } });
      }
    }
    const free = freeTileNear({ ...view, items }, { x: 0, y: 0 });
    expect(Math.max(Math.abs(free.x), Math.abs(free.y))).toBe(1);
  });
});
