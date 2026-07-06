/**
 * @jest-environment jsdom
 */
import { generateHTML, generateJSON } from '@tiptap/html';
import { EDITOR_EXTENSIONS } from '../MarkdownEditor';

// QUA-08 / DEP-04-follow-up: a node `description` is stored as an HTML string
// and rendered by regenerating it through the TipTap/ProseMirror schema built
// from EDITOR_EXTENSIONS. That schema is the XSS boundary (see SECURITY.md):
// `generateJSON` parses the supplied HTML into a document containing only the
// registered nodes/marks — every unknown tag (`<img>`, `<script>`,
// `<iframe>`, `<svg>`, `<style>`) and every undeclared attribute
// (`onerror`, `onload`, `srcdoc`) is dropped — and `generateHTML`
// re-serialises purely from that document. The SafeLink extension additionally
// routes every href through sanitizeLinkUrl. These tests exercise the real
// extension set and confirm the payloads are neutralised on the way IN.
const clean = (html: string): string => {
  return generateHTML(generateJSON(html, EDITOR_EXTENSIONS), EDITOR_EXTENSIONS);
};

describe('MarkdownEditor description XSS containment (QUA-08)', () => {
  test('strips an <img onerror=...> payload but keeps benign text', () => {
    const out = clean('<img src=x onerror=alert(1)>Hello');
    expect(out).not.toMatch(/<img/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).toContain('Hello');
  });

  test('strips a <script> payload', () => {
    const out = clean('<script>alert(1)</script>safe');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('safe');
  });

  test('strips an <iframe> payload', () => {
    const out = clean('<iframe src="https://evil.example"></iframe>text');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).toContain('text');
  });

  test('strips an <svg onload=...> payload', () => {
    const out = clean('<svg onload=alert(1)></svg>x');
    expect(out).not.toMatch(/<svg/i);
    expect(out).not.toMatch(/onload/i);
    expect(out).toContain('x');
  });

  test('keeps an allowlisted mark (bold) so the test is not vacuous', () => {
    // `bold` IS in EDITOR_EXTENSIONS, so it must survive — proving the schema
    // genuinely runs (and the drops above are real, not a side effect of
    // nothing rendering). TipTap serialises bold as <strong>.
    const out = clean('<strong>bold</strong>');
    expect(out).toMatch(/<strong>bold<\/strong>/);
  });

  test('drops links with a forbidden protocol (javascript:) — no href reaches the DOM', () => {
    const out = clean('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/<a\b/i); // link mark dropped entirely
    expect(out).toContain('click'); // text content survives
  });

  test('drops links with a data: protocol', () => {
    const out = clean('<a href="data:text/html,payload">click</a>');
    expect(out).not.toMatch(/data:/i);
    expect(out).not.toMatch(/<a\b/i);
    expect(out).toContain('click');
  });

  test('preserves links with an allowed protocol (https:)', () => {
    const out = clean('<a href="https://ok.example/path">ok</a>');
    expect(out).toMatch(/href="https:\/\/ok\.example\/path"/);
    expect(out).toContain('ok');
  });
});
