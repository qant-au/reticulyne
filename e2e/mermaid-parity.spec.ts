import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMermaid } from '../src/mermaid/parse';
import {
  MERMAID_VERSIONS,
  mermaidParse,
  withMermaid
} from './mermaid-lib';

/**
 * Reticulyne's flowchart reader against Mermaid's own parser, on the whole
 * corpus (src/mermaid/__tests__/corpus): what Reticulyne accepts, Mermaid
 * accepts; what Reticulyne refuses, Mermaid refuses too, except for the
 * few places Reticulyne is stricter on purpose, listed below with why.
 */
const CORPUS = join(__dirname, '../src/mermaid/__tests__/corpus');

// Stricter than Mermaid on purpose. Each entry says why.
const STRICTER: Record<string, string> = {
  // Prototype keys are refused as ids whatever Mermaid allows.
  'MMD_BAD_ID.proto.mmd': 'refuses __proto__ as an id',
  // A Markdown file is unwrapped by Reticulyne; Mermaid sees prose.
  'MMD_NO_HEADER.md-without-mermaid.md': 'not a Mermaid file at all',
  // Valid Mermaid, but not a flowchart: Reticulyne imports flowcharts only.
  'MMD_UNSUPPORTED_DIAGRAM.architecture.mmd': 'not a flowchart',
  'MMD_UNSUPPORTED_DIAGRAM.class.mmd': 'not a flowchart',
  'MMD_UNSUPPORTED_DIAGRAM.sequence.mmd': 'not a flowchart',
  // Mermaid draws these, oddly; Reticulyne refuses them as mistakes.
  'MMD_SUBGRAPH_CYCLE.mmd': 'two subgraphs inside each other',
  'MMD_TOO_DEEP.mmd': 'subgraphs nested over 32 deep',
  'MMD_BAD_SHAPE_DATA.no-colon.mmd': '@{ } entries must be key: value'
};

const files = (kind: 'valid' | 'invalid') => {
  return readdirSync(join(CORPUS, kind)).sort();
};

// Mermaid is handed the diagram itself: a Markdown file's fence body.
const mermaidSource = (text: string) => {
  const fence = /```mermaid\n([\s\S]*?)```/.exec(text);
  return fence ? fence[1] : text;
};

for (const pkg of MERMAID_VERSIONS) {
  test.describe(`parity with ${pkg}`, () => {
    test('every file Reticulyne reads, Mermaid reads', async ({ page }) => {
      await withMermaid(page, pkg);
      const disagree: string[] = [];
      for (const name of files('valid')) {
        const text = readFileSync(join(CORPUS, 'valid', name), 'utf8');
        expect(parseMermaid(text).flowchart, name).toBeDefined();
        const verdict = await mermaidParse(page, mermaidSource(text));
        if (verdict) disagree.push(`${name}: ${verdict}`);
      }
      expect(disagree).toEqual([]);
    });

    test('every file Reticulyne refuses, Mermaid refuses', async ({ page }) => {
      await withMermaid(page, pkg);
      const disagree: string[] = [];
      for (const name of files('invalid')) {
        const text = readFileSync(join(CORPUS, 'invalid', name), 'utf8');
        expect(parseMermaid(text).flowchart, name).toBeUndefined();
        if (STRICTER[name]) continue;
        const verdict = await mermaidParse(page, mermaidSource(text));
        if (verdict === null) disagree.push(name);
      }
      expect(disagree).toEqual([]);
    });
  });
}
