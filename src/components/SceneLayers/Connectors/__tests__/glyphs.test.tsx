/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react';
import { connectorGlyphOptions } from 'src/types';
import { GLYPHS, GlyphRenderer } from '../glyphs';

afterEach(() => {
  cleanup();
});

// SVG primitives like <polygon> / <circle> / <rect> are only valid
// inside an <svg> ancestor. JSDOM warns and ignores naked SVG nodes
// otherwise, which makes querySelector return null.
const renderInSvg = (node: React.ReactNode) => {
  return render(<svg data-testid="root">{node}</svg>);
};

describe('FEA5-05 glyph registry', () => {
  test('every option in connectorGlyphOptions has a registry entry', () => {
    connectorGlyphOptions.forEach((slug) => {
      expect(GLYPHS[slug]).toBeDefined();
      expect(typeof GLYPHS[slug].Component).toBe('function');
      expect(typeof GLYPHS[slug].rotateWithLine).toBe('boolean');
      expect(typeof GLYPHS[slug].label).toBe('string');
      expect(GLYPHS[slug].label.length).toBeGreaterThan(0);
    });
  });

  test('triangle is the default and matches the legacy polygon', () => {
    // The pre-FEA5-05 hardcoded arrowhead was this polygon; if it
    // ever changes here, existing diagrams will render differently.
    const { container } = renderInSvg(<GlyphRenderer rotation={0} />);
    const poly = container.querySelector('polygon');
    expect(poly).not.toBeNull();
    expect(poly?.getAttribute('points')).toBe(
      '17.58,17.01 0,-17.01 -17.58,17.01'
    );
  });

  test('GlyphRenderer applies rotation only when rotateWithLine is true', () => {
    // triangle: rotateWithLine = true → outer <g> carries rotate(45)
    const { container: tri } = renderInSvg(
      <GlyphRenderer glyph="triangle" rotation={45} />
    );
    expect(tri.querySelector('g')?.getAttribute('transform')).toBe(
      'rotate(45)'
    );

    // dollar: rotateWithLine = false → outer <g> has no transform
    // (jsdom serialises a missing attr as null)
    const { container: dol } = renderInSvg(
      <GlyphRenderer glyph="dollar" rotation={45} />
    );
    expect(dol.querySelector('g')?.getAttribute('transform')).toBeNull();
  });

  test.each(connectorGlyphOptions)(
    'glyph %s renders without errors',
    (slug) => {
      const { container } = renderInSvg(
        <GlyphRenderer glyph={slug} rotation={0} />
      );
      // Each glyph must emit at least one visible SVG primitive
      // (polygon / circle / rect / text / polyline / line / path).
      const primitive = container.querySelector(
        'polygon, circle, rect, text, polyline, line, path'
      );
      expect(primitive).not.toBeNull();
    }
  );

  test('unknown glyph slug falls back to triangle without throwing', () => {
    const { container } = renderInSvg(
      // @ts-expect-error -- intentionally passing an unknown slug
      <GlyphRenderer glyph="not-a-real-glyph" rotation={0} />
    );
    expect(container.querySelector('polygon')).not.toBeNull();
  });
});

describe('FEA5-06 glyph motion', () => {
  test('omitting the motion prop renders a static glyph (no animateMotion)', () => {
    const { container } = renderInSvg(
      <GlyphRenderer glyph="dollar" rotation={0} />
    );
    expect(container.querySelector('animateMotion')).toBeNull();
  });

  test('motion prop emits <animateMotion> with the path mpath href', () => {
    const { container } = renderInSvg(
      <GlyphRenderer
        glyph="dollar"
        rotation={0}
        motion={{ pathHref: '#some-path-id', durSeconds: 2 }}
      />
    );
    const motion = container.querySelector('animateMotion');
    expect(motion).not.toBeNull();
    expect(motion?.getAttribute('dur')).toBe('2s');
    expect(motion?.getAttribute('repeatCount')).toBe('indefinite');
    expect(motion?.querySelector('mpath')?.getAttribute('href')).toBe(
      '#some-path-id'
    );
  });

  test('rotateWithLine glyphs get rotate="auto", others get rotate="0"', () => {
    // triangle: rotateWithLine = true
    const { container: tri } = renderInSvg(
      <GlyphRenderer
        glyph="triangle"
        rotation={0}
        motion={{ pathHref: '#p', durSeconds: 2 }}
      />
    );
    expect(tri.querySelector('animateMotion')?.getAttribute('rotate')).toBe(
      'auto'
    );

    // dollar: rotateWithLine = false
    const { container: dol } = renderInSvg(
      <GlyphRenderer
        glyph="dollar"
        rotation={0}
        motion={{ pathHref: '#p', durSeconds: 2 }}
      />
    );
    expect(dol.querySelector('animateMotion')?.getAttribute('rotate')).toBe(
      '0'
    );
  });

  test('reverse flag swaps keyPoints so the glyph travels end-to-start', () => {
    const { container: fwd } = renderInSvg(
      <GlyphRenderer
        glyph="triangle"
        rotation={0}
        motion={{ pathHref: '#p', durSeconds: 2 }}
      />
    );
    expect(fwd.querySelector('animateMotion')?.getAttribute('keyPoints')).toBe(
      '0;1'
    );

    const { container: rev } = renderInSvg(
      <GlyphRenderer
        glyph="triangle"
        rotation={0}
        motion={{ pathHref: '#p', durSeconds: 2, reverse: true }}
      />
    );
    expect(rev.querySelector('animateMotion')?.getAttribute('keyPoints')).toBe(
      '1;0'
    );
  });
});
