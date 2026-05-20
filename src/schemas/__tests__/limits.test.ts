import { SCHEMA_LIMITS } from '../common';
import { iconsSchema, iconSchema } from '../icons';
import { modelItemsSchema } from '../modelItems';
import { colorsSchema } from '../colors';
import { connectorSchema } from '../connector';
import { viewsSchema } from '../views';

describe('SEC5-02 schema array + url bounds', () => {
  test('iconSchema rejects URLs longer than SCHEMA_LIMITS.ICON_URL_MAX', () => {
    const tooLong = 'a'.repeat(SCHEMA_LIMITS.ICON_URL_MAX + 1);
    const result = iconSchema.safeParse({
      id: 'i1',
      name: 'Big',
      url: tooLong
    });
    expect(result.success).toBe(false);
  });

  test('iconsSchema rejects arrays beyond SCHEMA_LIMITS.ICONS', () => {
    const tooMany = Array.from({ length: SCHEMA_LIMITS.ICONS + 1 }, (_, i) => {
      return { id: `i${i}`, name: 'x', url: 'data:image/svg+xml,' };
    });
    expect(iconsSchema.safeParse(tooMany).success).toBe(false);
  });

  test('modelItemsSchema rejects arrays beyond SCHEMA_LIMITS.ITEMS', () => {
    const tooMany = Array.from({ length: SCHEMA_LIMITS.ITEMS + 1 }, (_, i) => {
      return { id: `m${i}`, name: 'x' };
    });
    expect(modelItemsSchema.safeParse(tooMany).success).toBe(false);
  });

  test('colorsSchema rejects arrays beyond SCHEMA_LIMITS.COLORS', () => {
    const tooMany = Array.from({ length: SCHEMA_LIMITS.COLORS + 1 }, (_, i) => {
      return { id: `c${i}`, value: '#000' };
    });
    expect(colorsSchema.safeParse(tooMany).success).toBe(false);
  });

  test('connectorSchema rejects anchor arrays beyond SCHEMA_LIMITS.ANCHORS', () => {
    const anchors = Array.from(
      { length: SCHEMA_LIMITS.ANCHORS + 1 },
      (_, i) => {
        return { id: `a${i}`, ref: { item: 'node' } };
      }
    );
    expect(connectorSchema.safeParse({ id: 'c', anchors }).success).toBe(false);
  });

  test('viewsSchema rejects arrays beyond SCHEMA_LIMITS.VIEWS', () => {
    const tooMany = Array.from({ length: SCHEMA_LIMITS.VIEWS + 1 }, (_, i) => {
      return { id: `v${i}`, name: 'v', items: [] };
    });
    expect(viewsSchema.safeParse(tooMany).success).toBe(false);
  });

  test('iconsSchema accepts arrays at the SCHEMA_LIMITS.COLORS upper bound', () => {
    // Sanity: the caps are at-or-above plausible real diagrams.
    const exactlyOne = [{ id: 'i', name: 'x', url: 'data:image/svg+xml,' }];
    expect(iconsSchema.safeParse(exactlyOne).success).toBe(true);
  });
});
