/**
 * @jest-environment jsdom
 */
import type QuillType from 'quill';
import { EDITOR_FORMATS } from '../MarkdownEditor';

// `quill` ships ESM (jest can't transform node_modules under jsdom), so the
// jest config maps it to its UMD dist build whose `module.exports` IS the
// Quill class. esModuleInterop is off, so a default `import` would resolve
// to undefined at runtime — require() returns the class directly. The
// `import type` above keeps the real typings for `Quill`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Quill = require('quill') as typeof QuillType;

// QUA-08: a node `description` is rendered through Quill with a strict
// format allowlist (EDITOR_FORMATS). SECURITY.md relies on that allowlist
// to strip dangerous markup — anything not in the list (e.g. `<img>`,
// `<script>`) is dropped when Quill parses the supplied HTML, so an
// `onerror`/`onload` handler can never reach the DOM. These tests drive
// the real `quill` package (react-quill-new is mocked to null in jest, so
// a component render would assert "no onerror" vacuously) and confirm the
// payload is neutralised.

const mountQuill = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return new Quill(el, { formats: EDITOR_FORMATS });
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MarkdownEditor description XSS containment (QUA-08)', () => {
  test('strips an <img onerror=...> payload', () => {
    const q = mountQuill();
    q.clipboard.dangerouslyPasteHTML('<img src=x onerror=alert(1)>Hello');

    const html = q.root.innerHTML;
    expect(q.root.querySelector('[onerror]')).toBeNull();
    expect(q.root.querySelector('img')).toBeNull();
    expect(html).not.toMatch(/onerror/i);
    // The benign text alongside the payload survives.
    expect(q.getText()).toContain('Hello');
  });

  test('strips a <script> payload', () => {
    const q = mountQuill();
    q.clipboard.dangerouslyPasteHTML('<script>alert(1)</script>safe');

    expect(q.root.querySelector('script')).toBeNull();
    expect(q.root.innerHTML).not.toMatch(/<script/i);
    expect(q.getText()).toContain('safe');
  });

  test('keeps an allowlisted format (bold) so the test is not vacuous', () => {
    const q = mountQuill();
    q.clipboard.dangerouslyPasteHTML('<strong>bold</strong>');

    // `bold` IS in EDITOR_FORMATS, so it must survive — proving the
    // allowlist genuinely runs (and the <img>/<script> drops above are
    // real, not a side effect of nothing rendering).
    expect(q.root.querySelector('strong, b')).not.toBeNull();
  });
});
