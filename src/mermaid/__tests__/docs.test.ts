import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SHAPES } from '../shapes';
import { MERMAID_ERRORS, MERMAID_WARNINGS } from '../issues';

// docs/mermaid.md prints the shape table and every issue code. The table
// is generated here: `UPDATE_MERMAID_DOCS=1 npx jest src/mermaid` rewrites
// it after a change to shapes.ts, and this test fails until that is done.
const DOC = join(__dirname, '../../../docs/mermaid.md');
const START = /<!-- shapes:start[^>]*-->\n/;
const END = '<!-- shapes:end -->';

const code = (s: string) => {
  return `\`${s}\``;
};

export const shapeTable = () => {
  const rows = SHAPES.map((s) => {
    return [
      code(s.shape),
      s.meaning,
      s.aliases.map(code).join(', '),
      s.brackets ? code(`${s.brackets[0]} ${s.brackets[1]}`) : '',
      `${code(s.drawing)}${s.approximate ? ' (approximate)' : ''}`,
      s.classic ? code(s.classic) : ''
    ];
  });
  return [
    '| Shape | Means | Also accepted as | Brackets | Drawing | Classic |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => {
      return `| ${r.join(' | ')} |`.replace(/ {2}\|/g, ' |');
    })
  ].join('\n');
};

describe('docs/mermaid.md', () => {
  const doc = readFileSync(DOC, 'utf8');

  it('prints the shape table as shapes.ts has it', () => {
    const start = START.exec(doc);
    expect(start).not.toBeNull();
    const from = start!.index + start![0].length;
    const to = doc.indexOf(END);
    const table = shapeTable();
    if (process.env.UPDATE_MERMAID_DOCS) {
      writeFileSync(DOC, `${doc.slice(0, from)}${table}\n${doc.slice(to)}`);
      return;
    }
    expect(doc.slice(from, to).trim()).toBe(table);
  });

  it('documents every error and warning code', () => {
    for (const c of [
      ...Object.keys(MERMAID_ERRORS),
      ...Object.keys(MERMAID_WARNINGS)
    ]) {
      expect([c, doc.includes(`| \`${c}\` |`)]).toEqual([c, true]);
    }
  });
});
