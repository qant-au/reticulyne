/**
 * @jest-environment jsdom
 */
import { sanitizeSvgDataUri } from '../sanitizeSvgDataUri';

// SEC-01: SVG data URIs inlined at export time must not carry executable
// content. These tests lock in the stripping of <script>, <foreignObject>,
// and on* handlers, and confirm non-SVG payloads pass through untouched.

const svgToDataUri = (svg: string): string => {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const decode = (dataUri: string): string => {
  const b64 = dataUri.slice(dataUri.indexOf(',') + 1);
  return atob(b64);
};

describe('sanitizeSvgDataUri', () => {
  test('strips <script> from an SVG data URI', () => {
    const dirty = svgToDataUri(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>'
    );
    const out = decode(sanitizeSvgDataUri(dirty));
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<rect');
  });

  test('strips <foreignObject>', () => {
    const dirty = svgToDataUri(
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject></svg>'
    );
    const out = decode(sanitizeSvgDataUri(dirty));
    expect(out.toLowerCase()).not.toContain('foreignobject');
  });

  test('strips on* event-handler attributes', () => {
    const dirty = svgToDataUri(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)" onclick="x()" width="1"/></svg>'
    );
    const out = decode(sanitizeSvgDataUri(dirty));
    expect(out).not.toContain('onload');
    expect(out).not.toContain('onclick');
    expect(out).toContain('width');
  });

  test('preserves a clean SVG', () => {
    const clean =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>';
    const out = decode(sanitizeSvgDataUri(svgToDataUri(clean)));
    expect(out).toContain('<circle');
    expect(out).toContain('r="5"');
  });

  test('returns a non-SVG data URI unchanged', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(sanitizeSvgDataUri(png)).toBe(png);
  });

  test('returns a non-data string unchanged', () => {
    const url = 'https://cdn.example.com/icon.svg';
    expect(sanitizeSvgDataUri(url)).toBe(url);
  });
});
