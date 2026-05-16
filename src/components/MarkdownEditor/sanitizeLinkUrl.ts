export const ALLOWED_LINK_PROTOCOLS = ['http', 'https', 'mailto', 'tel'];
export const SANITIZED_URL = 'about:blank';

const FORBIDDEN_PROTOCOLS = ['javascript', 'data', 'vbscript', 'file', 'blob'];

export const sanitizeLinkUrl = (url: unknown): string => {
  if (typeof url !== 'string') return SANITIZED_URL;
  const trimmed = url.trim();
  if (!trimmed) return SANITIZED_URL;

  const lowered = trimmed.toLowerCase();
  for (const proto of FORBIDDEN_PROTOCOLS) {
    if (lowered.startsWith(`${proto}:`) || lowered.startsWith(`${proto}%3a`)) {
      return SANITIZED_URL;
    }
  }

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return trimmed;

  const protocol = lowered.slice(0, colonIdx);
  return ALLOWED_LINK_PROTOCOLS.includes(protocol) ? trimmed : SANITIZED_URL;
};
