import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { ICON_PACK_SCHEMA_URL, iconPackSchema } from '../pack';

// schema/icon-pack.json is the JSON Schema (Draft 2020-12) of an icon pack,
// generated from the Zod schema and shipped in the package (dist/schema/), so
// a pack can be checked by tools outside JavaScript. Structure only: port
// and media rules are checked by validateIconPack. `npm run schema` rewrites
// it; this keeps the committed file in step with the code.

const file = join(__dirname, '../../../schema/icon-pack.json');

const generated = () => {
  const schema = z.toJSONSchema(iconPackSchema, {
    target: 'draft-2020-12',
    unrepresentable: 'any'
  });
  return (
    JSON.stringify(
      { $id: ICON_PACK_SCHEMA_URL, title: 'Reticulyne icon pack', ...schema },
      null,
      2
    ) + '\n'
  );
};

test('the committed JSON Schema matches the icon pack schema', () => {
  if (process.env.UPDATE_SCENE_SCHEMA) writeFileSync(file, generated());
  expect(readFileSync(file, 'utf8')).toBe(generated());
});
