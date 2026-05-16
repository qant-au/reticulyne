import { sanitizeLinkUrl, SANITIZED_URL } from '../sanitizeLinkUrl';

describe('sanitizeLinkUrl', () => {
  describe('allowed protocols', () => {
    test.each([
      ['http://example.com', 'http://example.com'],
      ['https://example.com/path?q=1', 'https://example.com/path?q=1'],
      ['mailto:user@example.com', 'mailto:user@example.com'],
      ['tel:+61400000000', 'tel:+61400000000']
    ])('allows %s', (input, expected) => {
      expect(sanitizeLinkUrl(input)).toBe(expected);
    });
  });

  describe('forbidden protocols', () => {
    test.each([
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'blob:https://example.com/abc'
    ])('rejects %s', (input) => {
      expect(sanitizeLinkUrl(input)).toBe(SANITIZED_URL);
    });
  });

  describe('encoded protocols', () => {
    test.each([
      'javascript%3aalert(1)',
      'JAVASCRIPT%3Aalert(1)',
      'data%3atext/html'
    ])('rejects encoded %s', (input) => {
      expect(sanitizeLinkUrl(input)).toBe(SANITIZED_URL);
    });
  });

  describe('relative URLs', () => {
    test.each(['/path', 'page.html', '../up', '#fragment'])(
      'allows relative %s',
      (input) => {
        expect(sanitizeLinkUrl(input)).toBe(input);
      }
    );
  });

  describe('edge cases', () => {
    test('empty string returns sanitized url', () => {
      expect(sanitizeLinkUrl('')).toBe(SANITIZED_URL);
    });
    test('whitespace-only returns sanitized url', () => {
      expect(sanitizeLinkUrl('   ')).toBe(SANITIZED_URL);
    });
    test('non-string returns sanitized url', () => {
      expect(sanitizeLinkUrl(null)).toBe(SANITIZED_URL);
      expect(sanitizeLinkUrl(undefined)).toBe(SANITIZED_URL);
      expect(sanitizeLinkUrl(42)).toBe(SANITIZED_URL);
    });
    test('unknown protocol returns sanitized url', () => {
      expect(sanitizeLinkUrl('ftp://example.com')).toBe(SANITIZED_URL);
      expect(sanitizeLinkUrl('ws://example.com')).toBe(SANITIZED_URL);
    });
  });
});
