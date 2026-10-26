import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Import Mermaid: pasted or opened text is read as it is typed, every
 * problem is shown at its place with Import held off, and a good
 * flowchart replaces the diagram, laid out on tiles.
 */
const openImport = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Import Mermaid' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import Mermaid' });
  await expect(dialog).toBeVisible();
  return dialog;
};

const GOOD = [
  'flowchart LR',
  '  start([Order placed]) --> pay{Paid?}',
  '  pay -->|Yes| ship[Ship it]',
  '  pay -->|No| remind[/Send reminder/]',
  '  remind -.-> pay',
  '  subgraph warehouse [Warehouse]',
  '    ship --> done(((Delivered)))',
  '  end'
].join('\n');

const BROKEN: [string, string][] = [
  [
    'flowchart LR\n  A[Start --> B',
    'Line 2, col 4: Expected "]" to close the "["'
  ],
  [
    'flowchart LR\n  A -> B',
    'Line 2, col 5: "->" is not a Mermaid link. Did you mean "-->"?'
  ],
  [
    'flowchart LR\n  A{Choice] --> B',
    'Line 2, col 11: "]" cannot close the "{"'
  ],
  [
    'flowchart LR\n  subgraph S\n  A --> B',
    'Line 2, col 3: The subgraph "S" opened on line 2 is never closed with "end".'
  ],
  ['flowchart LR\n  A --> end', 'Line 2, col 9: "end" is a Mermaid keyword'],
  [
    'sequenceDiagram\n  A->>B: hi',
    '"sequenceDiagram" diagrams can\'t be imported'
  ],
  ['flowchart XY\n  A --> B', 'Line 1, col 11: "XY" is not a direction'],
  [
    'flowchart LR\n  A@{ shape: blob }',
    'Mermaid has no node shape called "blob"'
  ],
  ['A --> B', 'A flowchart starts with "flowchart" or "graph"']
];

test('broken text is explained at its place and cannot be imported', async ({
  page
}) => {
  const dialog = await openImport(page);
  const box = dialog.getByTestId('mermaid-import-text');
  const button = dialog.getByTestId('mermaid-import-button');
  for (const [text, message] of BROKEN) {
    await box.fill(text);
    await expect(dialog.getByTestId('mermaid-import-errors')).toContainText(
      message
    );
    await expect(button).toBeDisabled();
  }
});

test('a flowchart imports, laid out, and exports back', async ({ page }) => {
  const dialog = await openImport(page);
  await dialog.getByTestId('mermaid-import-text').fill(GOOD);
  await expect(dialog.getByTestId('mermaid-import-summary')).toHaveText(
    'Ready to import: 5 nodes, 5 links.'
  );
  await dialog.getByTestId('mermaid-import-button').click();
  await expect(dialog).toBeHidden();
  for (const label of [
    'Order placed',
    'Paid?',
    'Ship it',
    'Send reminder',
    'Delivered'
  ]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  // Out again: the same graph, shapes and group.
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('menuitem', { name: 'Export as Mermaid' }).click();
  const text = await page.getByTestId('mermaid-export-text').textContent();
  expect(text).toContain('start(["Order placed"])');
  expect(text).toContain('pay{"Paid?"}');
  expect(text).toContain('remind[/"Send reminder"/]');
  expect(text).toContain('done((("Delivered")))');
  expect(text).toContain('subgraph warehouse ["Warehouse"]');
  expect(text).toContain('pay -->|"Yes"| ship');
  expect(text).toContain('remind -.-> pay');
});

test('a Markdown file opens with its mermaid block', async ({ page }) => {
  const dialog = await openImport(page);
  await dialog.getByTestId('mermaid-import-file').setInputFiles({
    name: 'design.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      `# Design\n\nProse.\n\n\`\`\`mermaid\n${GOOD}\n\`\`\`\n`
    )
  });
  await expect(dialog.getByTestId('mermaid-import-text')).toHaveValue(
    /flowchart LR/
  );
  await expect(dialog.getByTestId('mermaid-import-button')).toBeEnabled();
  // An error in it is placed on the file's own line numbers.
  const broken = (
    await dialog.getByTestId('mermaid-import-text').inputValue()
  ).replace('pay -->|Yes| ship', 'pay ->|Yes| ship');
  await dialog.getByTestId('mermaid-import-text').fill(broken);
  await expect(dialog.getByTestId('mermaid-import-errors')).toContainText(
    'Line 8, col'
  );
});

test('a click line is dropped with a warning and nothing navigates', async ({
  page
}) => {
  const dialog = await openImport(page);
  await dialog
    .getByTestId('mermaid-import-text')
    .fill('flowchart LR\n  A --> B\n  click A "https://example.com" _self');
  await expect(dialog.getByTestId('mermaid-import-warnings')).toContainText(
    'Click actions and links on nodes are not imported.'
  );
  const url = page.url();
  await dialog.getByTestId('mermaid-import-button').click();
  await page.getByText('A', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  expect(page.url()).toBe(url);
});

test('choosing an error moves the cursor to it', async ({ page }) => {
  const dialog = await openImport(page);
  const box = dialog.getByTestId('mermaid-import-text');
  await box.fill('flowchart LR\n  A --> B\n  C -> D');
  await dialog.getByText(/Line 3, col 5/).click();
  const caret = await box.evaluate((el) => {
    return (el as HTMLTextAreaElement).selectionStart;
  });
  expect(caret).toBe('flowchart LR\n  A --> B\n  C '.length);
  void readFile;
});
