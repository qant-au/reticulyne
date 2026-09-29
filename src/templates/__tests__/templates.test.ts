import { initialDataSchema } from 'src/schemas/model';
import { icons, colors } from 'src/examples/initialData';
import { TEMPLATES, templateToInitialData } from '../index';

// every bundled template must load. Runs on every PR with
// the rest of the unit suite.
describe.each(TEMPLATES)('template "$name"', (template) => {
  test('every icon it names is in the bundled isopacks', () => {
    const known = new Set(
      icons.map((icon) => {
        return icon.id;
      })
    );
    const missing = template.items
      .map((item) => {
        return item.icon;
      })
      .filter((id) => {
        return id && !known.has(id);
      });
    expect(missing).toEqual([]);
  });

  test('passes the model schema with the full icon set', () => {
    const result = initialDataSchema.safeParse(
      templateToInitialData(template, icons, colors)
    );
    expect(result.error?.issues ?? []).toEqual([]);
  });

  test('still loads with no icons at all, minus the icons', () => {
    const data = templateToInitialData(template, [], colors);
    expect(initialDataSchema.safeParse(data).success).toBe(true);
    expect(
      data.items.every((item) => {
        return item.icon === undefined;
      })
    ).toBe(true);
  });
});

test('template ids are unique', () => {
  const ids = TEMPLATES.map((t) => {
    return t.id;
  });
  expect(new Set(ids).size).toBe(ids.length);
});
