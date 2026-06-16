import { iconSchema } from '../icons';
import { isAllowedIconUrl } from '../common';

// SEC-01: the icon url scheme allowlist. http(s):, blob:, relative paths,
// and image-only data: URIs are accepted; javascript:, file:, and
// non-image data: URIs are rejected at schema-validation time.

const parseUrl = (url: string) => {
  return iconSchema.safeParse({ id: 'i1', name: 'Icon', url });
};

describe('SEC-01 icon url allowlist', () => {
  describe('accepted', () => {
    test.each([
      'https://cdn.example.com/icon.svg',
      'http://localhost:8080/icon.png',
      '/icons/app.svg',
      './relative/icon.png',
      'icons/app.svg',
      'blob:https://example.com/2b3c-uuid',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'data:image/png;base64,iVBORw0KGgo=',
      'data:image/webp;base64,UklGRg==',
      ''
    ])('accepts %s', (url) => {
      expect(isAllowedIconUrl(url)).toBe(true);
      expect(parseUrl(url).success).toBe(true);
    });
  });

  describe('rejected', () => {
    test.each([
      'javascript:alert(1)',
      'javascript%3aalert(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:application/xml,<x/>',
      'file:///etc/passwd',
      'vbscript:msgbox(1)'
    ])('rejects %s', (url) => {
      expect(isAllowedIconUrl(url)).toBe(false);
      expect(parseUrl(url).success).toBe(false);
    });
  });
});
