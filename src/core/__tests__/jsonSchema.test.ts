import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { SCENE_SCHEMA_URL, SCENE_VERSION, sceneShapeSchema } from 'src/core';

// schema/scene-v<SCENE_VERSION>.json is the JSON Schema (Draft 2020-12)
// generated from the Zod schema, shipped in the package (dist/schema/) so a
// scene can be validated in any language. Structure only: id references are
// checked by the library. `npm run schema` rewrites it; this keeps the
// committed file in step with the code.

const file = join(__dirname, `../../../schema/scene-v${SCENE_VERSION}.json`);

const generated = () => {
  const schema = z.toJSONSchema(sceneShapeSchema, {
    target: 'draft-2020-12',
    // Refinements (url schemes, a link needing a ref or url) cannot be
    // expressed; the structure they sit on still is.
    unrepresentable: 'any'
  });
  return (
    JSON.stringify(
      {
        $id: SCENE_SCHEMA_URL,
        title: `Reticulyne scene, version ${SCENE_VERSION}`,
        ...schema
      },
      null,
      2
    ) + '\n'
  );
};

test('the committed JSON Schema matches the scene schema', () => {
  if (process.env.UPDATE_SCENE_SCHEMA) writeFileSync(file, generated());
  expect(readFileSync(file, 'utf8')).toBe(generated());
});
