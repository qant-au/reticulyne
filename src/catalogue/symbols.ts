// 2D schematic symbols (the flat, Visio-style view) for the catalogue items
// that have no Accurona twin. An item with a twin uses the schematic Accurona
// generates from the element's model instead (src/vendor/accurona-schematic).
// Same look as those: Accurona's palette, one line weight, a 40-unit box for
// small parts and virtual things, a front view for devices.

const OUTLINE = '#2b2b2b';
const DETAIL = '#8a857c';
const BODY = '#f7f5f1';
const SOFT = '#e4dfd6';
const DARK = '#5b6770';
const GLASS = '#d6e8f5';
const NETWORK = '#2f6fb0';
const POWER = '#d98a1f';
const FIRE = '#c0392b';

const svg = (viewBox: string, body: string) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
};

// The rounded 40 × 40 frame Accurona gives wall and ceiling devices.
const frame = (fill = BODY) => {
  return `<rect x="0.5" y="0.5" width="39" height="39" rx="6" fill="${fill}" stroke="${OUTLINE}" stroke-width="1"/>`;
};

// An NMEA 2000 backbone connector body seen from the front: a dark bar with a
// female socket on the left and a male plug on the right.
const n2kBar = (x: number, w: number) => {
  return (
    `<rect x="${x}" y="22" width="${w}" height="9" rx="2" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
    `<rect x="${x - 4}" y="23.5" width="4" height="6" rx="1" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
    `<rect x="${x + w}" y="24.5" width="4" height="4" rx="0.5" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="1"/>`
  );
};

// A drop socket rising from the bar.
const n2kDrop = (cx: number) => {
  return (
    `<rect x="${cx - 2.5}" y="14" width="5" height="8" rx="1" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
    `<circle cx="${cx}" cy="15.5" r="0.8" fill="${SOFT}"/>`
  );
};

// A terminator: a short cap with a T on it.
const terminator = (male: boolean) => {
  const end = male
    ? `<rect x="27" y="17.5" width="5" height="5" rx="0.5" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="1"/>`
    : `<rect x="7" y="16.5" width="5" height="7" rx="1" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>`;
  const x = male ? 11 : 12;
  return svg(
    '0 0 40 40',
    `${end}<rect x="${x}" y="13" width="16" height="14" rx="3" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<path d="M${x + 4} 17 H${x + 12} M${x + 8} 17 V24" stroke="${BODY}" stroke-width="1.6" fill="none"/>`
  );
};

/** Schematic SVG by catalogue item id, for the items with no Accurona twin. */
export const ITEM_SYMBOLS: Record<string, string> = {
  // DIN-rail module: terminals along the top, RJ45 and LEDs on the front.
  'rs485-ethernet-gateway': svg(
    '-1 -1 42 32',
    `<rect x="0" y="4" width="40" height="26" rx="2" fill="${BODY}" stroke="${OUTLINE}" stroke-width="1"/>` +
      [4, 9, 14, 19]
        .map((x) => {
          return `<rect x="${x}" y="0" width="4" height="4" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="0.6"/><circle cx="${x + 2}" cy="2" r="0.9" fill="${DARK}"/>`;
        })
        .join('') +
      `<rect x="26" y="16" width="9" height="8" rx="0.5" fill="${OUTLINE}"/>` +
      `<rect x="28.5" y="22" width="4" height="2" fill="${SOFT}"/>` +
      `<circle cx="6" cy="12" r="1" fill="${NETWORK}"/><circle cx="10" cy="12" r="1" fill="${POWER}"/>` +
      `<path d="M5 20 H17 M13 17 L17 20 L13 23" stroke="${DETAIL}" stroke-width="0.8" fill="none"/>`
  ),

  'n2k-tee-4way': svg(
    '-5 12 50 20',
    n2kBar(0, 40) + [6, 15, 24, 33].map(n2kDrop).join('')
  ),
  'n2k-tee': svg('3 12 34 20', n2kBar(8, 24) + n2kDrop(20)),
  'n2k-terminator-male': terminator(true),
  'n2k-terminator-female': terminator(false),

  // A tee with the red and black DC leads coming out of it.
  'n2k-power-injector': svg(
    '3 4 34 28',
    n2kBar(8, 24) +
      `<path d="M16 22 C16 14 12 10 8 6" stroke="${FIRE}" stroke-width="1.4" fill="none"/>` +
      `<path d="M24 22 C24 14 28 10 32 6" stroke="${OUTLINE}" stroke-width="1.4" fill="none"/>` +
      `<circle cx="20" cy="26.5" r="1.3" fill="${POWER}"/>`
  ),

  // Dark bezel, chart on the screen, keys down the right.
  chartplotter: svg(
    '-1 -1 42 30',
    `<rect x="0" y="0" width="40" height="28" rx="2" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<rect x="2.5" y="2.5" width="27" height="23" rx="0.5" fill="${GLASS}" stroke="${OUTLINE}" stroke-width="0.6"/>` +
      `<path d="M2.5 16 C8 12 11 19 16 15 S24 8 29.5 11 V25.5 H2.5 Z" fill="${SOFT}" stroke="${DETAIL}" stroke-width="0.6"/>` +
      `<path d="M8 8 L21 20" stroke="${NETWORK}" stroke-width="0.8" stroke-dasharray="1.5 1" fill="none"/>` +
      [5, 10, 15, 20]
        .map((y) => {
          return `<rect x="32" y="${y}" width="5.5" height="3" rx="1" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="0.5"/>`;
        })
        .join('')
  ),

  // Radome on its pedestal.
  'marine-radar': svg(
    '-1 -1 42 24',
    `<path d="M0 14 A20 13 0 0 1 40 14 Z" fill="${BODY}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<rect x="1" y="14" width="38" height="4" rx="1" fill="${BODY}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<rect x="14" y="18" width="12" height="4" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<circle cx="20" cy="16" r="0.9" fill="${NETWORK}"/>`
  ),

  // A puck antenna on a short pole mount.
  'gps-receiver': svg(
    '5 3 30 36',
    `<path d="M8 18 A12 10 0 0 1 32 18 Z" fill="${BODY}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<rect x="7" y="18" width="26" height="4" rx="1" fill="${BODY}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<rect x="17" y="22" width="6" height="14" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<circle cx="20" cy="12" r="1" fill="${NETWORK}"/>`
  ),

  // A small dark box between a J1939 lead and an NMEA 2000 lead.
  'engine-gateway': svg(
    '-1 5 42 22',
    `<path d="M0 16 H10 M30 16 H40" stroke="${OUTLINE}" stroke-width="1.6" fill="none"/>` +
      `<rect x="10" y="7" width="20" height="18" rx="2" fill="${DARK}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<path d="M14 16 H26 M22 13 L26 16 L22 19" stroke="${BODY}" stroke-width="1" fill="none"/>` +
      `<circle cx="26" cy="10" r="0.9" fill="${NETWORK}"/>`
  ),

  // The resistor sign between two leads.
  'eol-resistor': svg(
    '-1 -1 42 42',
    frame() +
      `<path d="M4 20 H10 L12 15 L15 25 L18 15 L21 25 L24 15 L27 25 L29 20 H36" stroke="${OUTLINE}" stroke-width="1.5" fill="none"/>` +
      `<circle cx="32" cy="10" r="1.5" fill="${FIRE}"/>`
  ),

  // A loop broken by the isolator's two facing arrows.
  'fire-isolator': svg(
    '-1 -1 42 42',
    frame() +
      `<path d="M4 20 H13 M27 20 H36" stroke="${OUTLINE}" stroke-width="1.5" fill="none"/>` +
      `<path d="M13 14 L19 20 L13 26 Z M27 14 L21 20 L27 26 Z" fill="${FIRE}" stroke="${FIRE}" stroke-width="1"/>` +
      `<path d="M20 11 V29" stroke="${OUTLINE}" stroke-width="1.5" fill="none"/>`
  ),

  // A globe.
  internet: svg(
    '-1 -1 42 42',
    `<circle cx="20" cy="20" r="19" fill="${GLASS}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<ellipse cx="20" cy="20" rx="8" ry="19" fill="none" stroke="${NETWORK}" stroke-width="1"/>` +
      `<path d="M20 1 V39 M1 20 H39 M4 11 H36 M4 29 H36" stroke="${NETWORK}" stroke-width="1" fill="none"/>`
  ),

  // A tunnel with a padlock on it.
  'vpn-tunnel': svg(
    '-1 5 42 30',
    `<path d="M4 12 H36 M4 28 H36" stroke="${OUTLINE}" stroke-width="1" fill="none"/>` +
      `<ellipse cx="4" cy="20" rx="3" ry="8" fill="${SOFT}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<path d="M36 12 A3 8 0 0 1 36 28" fill="none" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<path d="M16.5 19 V15.5 A3.5 3.5 0 0 1 23.5 15.5 V19" fill="none" stroke="${OUTLINE}" stroke-width="1.4"/>` +
      `<rect x="14.5" y="19" width="11" height="8" rx="1" fill="${NETWORK}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<circle cx="20" cy="22.5" r="1" fill="${BODY}"/>`
  ),

  // A cloud.
  'cloud-service': svg(
    '-1 5 42 28',
    `<path d="M10 31 A7 7 0 0 1 9 17 A9 9 0 0 1 26 13 A8 8 0 0 1 33 31 Z" fill="${GLASS}" stroke="${OUTLINE}" stroke-width="1"/>` +
      `<circle cx="20" cy="24" r="1.2" fill="${NETWORK}"/>`
  )
};
