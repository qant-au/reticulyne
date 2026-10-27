import { sanitizeLinkUrl } from 'src/utils/sanitizeLinkUrl';

// A description as the editor shows it read-only (MarkdownEditor's
// ReadOnlyMarkdown): its HTML rebuilt from an allow-list, paragraphs, bold,
// italic, underline, strikethrough and links, with every link through the
// editor's own URL rule. The input is parsed inert (a DOMParser document
// runs no script and loads nothing) and only allowed nodes are copied out,
// built with createElement and textContent: no innerHTML.

const ALLOWED = new Set(['p', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'br']);
const NORMALISE: Record<string, string> = { b: 'strong', i: 'em' };

const copy = (source: Node, target: Node) => {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (child as Element).localName;
    if (!ALLOWED.has(tag)) {
      // An unknown wrapper keeps its text; script and style keep nothing.
      if (tag !== 'script' && tag !== 'style') copy(child, target);
      return;
    }
    const el = document.createElement(NORMALISE[tag] ?? tag);
    if (tag === 'a') {
      el.setAttribute(
        'href',
        sanitizeLinkUrl((child as Element).getAttribute('href'))
      );
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    copy(child, el);
    target.appendChild(el);
  });
};

/** The description's allowed content, as a fragment ready to append. */
export const richText = (value: string): DocumentFragment => {
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const fragment = document.createDocumentFragment();
  copy(parsed.body, fragment);
  // Bare text at the top level reads as one paragraph, as the editor
  // would have stored it.
  const loose = Array.from(fragment.childNodes).some((node) => {
    return node.nodeType === Node.TEXT_NODE && node.textContent?.trim();
  });
  if (loose) {
    const p = document.createElement('p');
    p.appendChild(fragment);
    const wrapped = document.createDocumentFragment();
    wrapped.appendChild(p);
    return wrapped;
  }
  return fragment;
};

/** The description as plain text, for the screen-reader outline. */
export const plainText = (value: string) => {
  return (
    new DOMParser().parseFromString(value, 'text/html').body.textContent ?? ''
  ).trim();
};
