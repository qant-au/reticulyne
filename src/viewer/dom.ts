// Element builders for the viewer. Styles go on through the CSSOM
// (element.style), never a <style> sheet or an inline style attribute in
// markup, so the viewer works under a strict Content Security Policy.

const SVG_NS = 'http://www.w3.org/2000/svg';

type Styles = Partial<Record<keyof CSSStyleDeclaration, string | number>>;

export const setStyle = (el: HTMLElement | SVGElement, styles: Styles) => {
  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined) return;
    const property = key.replace(/[A-Z]/g, (c) => {
      return `-${c.toLowerCase()}`;
    });
    el.style.setProperty(
      property,
      typeof value === 'number' ? `${value}px` : String(value)
    );
  });
};

export const div = (styles: Styles = {}, children: Node[] = []) => {
  const el = document.createElement('div');
  setStyle(el, styles);
  children.forEach((child) => {
    el.appendChild(child);
  });
  return el;
};

export const html = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Styles = {},
  text?: string
) => {
  const el = document.createElement(tag);
  setStyle(el, styles);
  if (text !== undefined) el.textContent = text;
  return el;
};

export const svg = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
  children: SVGElement[] = []
) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => {
    if (value !== undefined) el.setAttribute(name, String(value));
  });
  children.forEach((child) => {
    el.appendChild(child);
  });
  return el;
};
