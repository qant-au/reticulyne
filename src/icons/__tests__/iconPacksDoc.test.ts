import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateIconPack } from '../pack';

// Every JSON block in docs/icon-packs.md that is a whole pack must be one
// validateIconPack accepts, so the page never shows a pack that would be
// refused.

const doc = readFileSync(
  join(__dirname, '../../../docs/icon-packs.md'),
  'utf8'
);

// Fragments (a field shown on its own) are not whole JSON and are skipped.
const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const packBlocks = [...doc.matchAll(/```json\n([\s\S]*?)```/g)]
  .map((m) => {
    return parsed(m[1]);
  })
  .filter((value): value is Record<string, unknown> => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'sourceUrl' in value &&
      'icons' in value
    );
  });

test('the page shows at least one whole pack', () => {
  expect(packBlocks.length).toBeGreaterThan(0);
});

test.each(
  packBlocks.map((pack, i) => {
    return [i, pack];
  })
)('pack block %i is a valid pack', (_, pack) => {
  expect(validateIconPack(pack)).toMatchObject({ ok: true });
});
