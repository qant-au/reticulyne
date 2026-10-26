// Generates the source drawings of the Nautical Flags pack: for each of the
// 40 International Code of Signals flags, an isometric drawing
// (<id>.iso.svg), a flat one (<id>.flat.svg) and its detail (<id>.json),
// written to ./src beside the pack's pack.json. scripts/build-pack.mjs then
// turns ./src into the one pack file.
//
//   node packs/nautical-flags/generate.mjs
//
// Each flag is one list of coloured shapes on its own face (x along the fly,
// y down, the hoist at x = 0). The flat drawing lays the face out front-on;
// the isometric one maps the same shapes onto a vertical plane flying from
// a staff, so the two views always show the same flag. Colours are the five
// in COLOURS and nothing else; the outline and the staff use the library's
// ink and greys.

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'src');

// The flag colours (see README.md for where they come from).
export const COLOURS = {
  white: '#FFFFFF',
  blue: '#00247D',
  red: '#D6001C',
  yellow: '#FFD100',
  black: '#000000'
};
const { white: W, blue: U, red: R, yellow: Y, black: K } = COLOURS;

// The library's ink and staff greys (the same as the built-in drawings).
const INK = '#16213d';
const STAFF = '#c5cdda';
const STAFF_TOP = '#e9edf3';

// ---- Shapes, on a face `w` wide and 1 high ------------------------------

const rect = (x, y, w, h, fill) => {
  return {
    fill,
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h]
    ]
  };
};
const poly = (points, fill) => {
  return { fill, points };
};
const disc = (cx, cy, r, fill) => {
  const points = [];
  for (let i = 0; i < 48; i += 1) {
    const a = (i / 48) * Math.PI * 2;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { fill, points };
};
// A band of width `t` along the line from (x1, y1) to (x2, y2), run past
// both ends; the flag's outline clips it.
const band = (x1, y1, x2, y2, t, fill) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = (-uy * t) / 2;
  const ny = (ux * t) / 2;
  const a = [x1 - ux, y1 - uy];
  const b = [x2 + ux, y2 + uy];
  return poly(
    [
      [a[0] + nx, a[1] + ny],
      [b[0] + nx, b[1] + ny],
      [b[0] - nx, b[1] - ny],
      [a[0] - nx, a[1] - ny]
    ],
    fill
  );
};
const vStripes = (w, colours) => {
  const s = w / colours.length;
  return colours.map((c, i) => {
    return rect(i * s, 0, s, 1, c);
  });
};
const hStripes = (w, bands) => {
  // bands: [colour, height] from the top
  let y = 0;
  return bands.map(([c, h]) => {
    const r = rect(0, y, w, h, c);
    y += h;
    return r;
  });
};
const quarters = (w, tl, tr, bl, br) => {
  return [
    rect(0, 0, w / 2, 0.5, tl),
    rect(w / 2, 0, w / 2, 0.5, tr),
    rect(0, 0.5, w / 2, 0.5, bl),
    rect(w / 2, 0.5, w / 2, 0.5, br)
  ];
};
const cross = (w, cx, t, bg, fg) => {
  return [
    rect(0, 0, w, 1, bg),
    rect(cx - t / 2, 0, t, 1, fg),
    rect(0, 0.5 - t / 2, w, t, fg)
  ];
};
const saltire = (bg, fg) => {
  return [
    rect(0, 0, 1, 1, bg),
    band(0, 0, 1, 1, 0.175, fg),
    band(0, 1, 1, 0, 0.175, fg)
  ];
};

// ---- Outlines -------------------------------------------------------------

const SQUARE = {
  w: 1,
  outline: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ]
};
// Swallowtailed: the fly cut back a quarter of the length at the middle.
const SWALLOW = {
  w: 1,
  outline: [
    [0, 0],
    [1, 0],
    [0.75, 0.5],
    [1, 1],
    [0, 1]
  ]
};
// A numeral or answering pennant: tapered to half the height at the fly.
const PENNANT = {
  w: 1.8,
  outline: [
    [0, 0],
    [1.8, 0.25],
    [1.8, 0.75],
    [0, 1]
  ]
};
// A substitute: triangular.
const TRIANGLE = {
  w: 1.8,
  outline: [
    [0, 0],
    [1.8, 0.5],
    [0, 1]
  ]
};

// ---- The flags ------------------------------------------------------------

const yankee = () => {
  // Bendy sinister of ten, or and gules: ten stripes running up towards the
  // fly, yellow in the upper hoist corner.
  const shapes = [rect(0, 0, 1, 1, R)];
  for (let k = 0; k < 10; k += 2) {
    const a = k * 0.2;
    const b = a + 0.2;
    shapes.push(
      poly(
        [
          [a, 0],
          [b, 0],
          [b - 1, 1],
          [a - 1, 1]
        ],
        Y
      )
    );
  }
  return shapes;
};

const checks = (n, a, b) => {
  const s = 1 / n;
  const shapes = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      shapes.push(rect(c * s, r * s, s, s, (r + c) % 2 ? b : a));
    }
  }
  return shapes;
};

const letter = (id, name, code, shape, shapes, meaning) => {
  return { id, name: `${name} (${code})`, shape, shapes, meaning };
};

export const FLAGS = [
  letter(
    'alfa',
    'Alfa',
    'A',
    SWALLOW,
    vStripes(1, [W, U]),
    'I have a diver down; keep well clear at slow speed.'
  ),
  letter(
    'bravo',
    'Bravo',
    'B',
    SWALLOW,
    [rect(0, 0, 1, 1, R)],
    'I am taking in, discharging or carrying dangerous goods.'
  ),
  letter(
    'charlie',
    'Charlie',
    'C',
    SQUARE,
    hStripes(1, [
      [U, 0.2],
      [W, 0.2],
      [R, 0.2],
      [W, 0.2],
      [U, 0.2]
    ]),
    'Affirmative.'
  ),
  letter(
    'delta',
    'Delta',
    'D',
    SQUARE,
    hStripes(1, [
      [Y, 0.2],
      [U, 0.6],
      [Y, 0.2]
    ]),
    'Keep clear of me; I am manoeuvring with difficulty.'
  ),
  letter(
    'echo',
    'Echo',
    'E',
    SQUARE,
    hStripes(1, [
      [U, 0.5],
      [R, 0.5]
    ]),
    'I am altering my course to starboard.'
  ),
  letter(
    'foxtrot',
    'Foxtrot',
    'F',
    SQUARE,
    [
      rect(0, 0, 1, 1, W),
      poly(
        [
          [0.5, 0],
          [1, 0.5],
          [0.5, 1],
          [0, 0.5]
        ],
        R
      )
    ],
    'I am disabled; communicate with me.'
  ),
  letter(
    'golf',
    'Golf',
    'G',
    SQUARE,
    vStripes(1, [Y, U, Y, U, Y, U]),
    'I require a pilot.'
  ),
  letter(
    'hotel',
    'Hotel',
    'H',
    SQUARE,
    vStripes(1, [W, R]),
    'I have a pilot on board.'
  ),
  letter(
    'india',
    'India',
    'I',
    SQUARE,
    [rect(0, 0, 1, 1, Y), disc(0.5, 0.5, 0.25, K)],
    'I am altering my course to port.'
  ),
  letter(
    'juliett',
    'Juliett',
    'J',
    SQUARE,
    hStripes(1, [
      [U, 1 / 3],
      [W, 1 / 3],
      [U, 1 / 3]
    ]),
    'I am on fire and have dangerous cargo on board; keep well clear.'
  ),
  letter(
    'kilo',
    'Kilo',
    'K',
    SQUARE,
    vStripes(1, [Y, U]),
    'I wish to communicate with you.'
  ),
  letter(
    'lima',
    'Lima',
    'L',
    SQUARE,
    quarters(1, Y, K, K, Y),
    'You should stop your vessel instantly.'
  ),
  letter(
    'mike',
    'Mike',
    'M',
    SQUARE,
    saltire(U, W),
    'My vessel is stopped and making no way through the water.'
  ),
  letter('november', 'November', 'N', SQUARE, checks(4, U, W), 'Negative.'),
  letter(
    'oscar',
    'Oscar',
    'O',
    SQUARE,
    [
      rect(0, 0, 1, 1, R),
      poly(
        [
          [0, 0],
          [1, 1],
          [0, 1]
        ],
        Y
      )
    ],
    'Man overboard.'
  ),
  letter(
    'papa',
    'Papa',
    'P',
    SQUARE,
    [rect(0, 0, 1, 1, U), rect(1 / 3, 1 / 3, 1 / 3, 1 / 3, W)],
    'All persons should report on board; the vessel is about to proceed to sea.'
  ),
  letter(
    'quebec',
    'Quebec',
    'Q',
    SQUARE,
    [rect(0, 0, 1, 1, Y)],
    'My vessel is healthy and I request free pratique.'
  ),
  letter(
    'romeo',
    'Romeo',
    'R',
    SQUARE,
    cross(1, 0.5, 0.2, R, Y),
    'No single-flag meaning in the International Code.'
  ),
  letter(
    'sierra',
    'Sierra',
    'S',
    SQUARE,
    [rect(0, 0, 1, 1, W), rect(1 / 3, 1 / 3, 1 / 3, 1 / 3, U)],
    'I am operating astern propulsion.'
  ),
  letter(
    'tango',
    'Tango',
    'T',
    SQUARE,
    vStripes(1, [R, W, U]),
    'Keep clear of me; I am engaged in pair trawling.'
  ),
  letter(
    'uniform',
    'Uniform',
    'U',
    SQUARE,
    quarters(1, R, W, W, R),
    'You are running into danger.'
  ),
  letter(
    'victor',
    'Victor',
    'V',
    SQUARE,
    saltire(W, R),
    'I require assistance.'
  ),
  letter(
    'whiskey',
    'Whiskey',
    'W',
    SQUARE,
    [
      rect(0, 0, 1, 1, U),
      rect(0.2, 0.2, 0.6, 0.6, W),
      rect(0.4, 0.4, 0.2, 0.2, R)
    ],
    'I require medical assistance.'
  ),
  letter(
    'xray',
    'X-ray',
    'X',
    SQUARE,
    cross(1, 0.5, 0.2, W, U),
    'Stop carrying out your intentions and watch for my signals.'
  ),
  letter('yankee', 'Yankee', 'Y', SQUARE, yankee(), 'I am dragging my anchor.'),
  letter(
    'zulu',
    'Zulu',
    'Z',
    SQUARE,
    [
      rect(0, 0, 1, 1, Y),
      poly(
        [
          [0, 0],
          [0.5, 0.5],
          [0, 1]
        ],
        K
      ),
      poly(
        [
          [0, 1],
          [0.5, 0.5],
          [1, 1]
        ],
        R
      ),
      poly(
        [
          [1, 1],
          [0.5, 0.5],
          [1, 0]
        ],
        U
      )
    ],
    'I require a tug.'
  ),
  ...[
    ['zero', [rect(0, 0, 1.8, 1, Y), rect(0.6, 0, 0.6, 1, R)]],
    ['one', [rect(0, 0, 1.8, 1, W), disc(0.5, 0.5, 0.25, R)]],
    ['two', [rect(0, 0, 1.8, 1, U), disc(0.5, 0.5, 0.25, W)]],
    ['three', vStripes(1.8, [R, W, U])],
    ['four', cross(1.8, 0.5, 0.25, R, W)],
    ['five', vStripes(1.8, [Y, U])],
    [
      'six',
      hStripes(1.8, [
        [K, 0.5],
        [W, 0.5]
      ])
    ],
    [
      'seven',
      hStripes(1.8, [
        [Y, 0.5],
        [R, 0.5]
      ])
    ],
    ['eight', cross(1.8, 0.5, 0.25, W, R)],
    ['nine', quarters(1.8, W, K, R, Y)]
  ].map(([word, shapes], n) => {
    return {
      id: `pennant-${n}`,
      name: `Numeral Pennant ${n}`,
      shape: PENNANT,
      shapes,
      meaning: `The numeral ${n} (${word}).`
    };
  }),
  {
    id: 'substitute-1',
    name: 'First Substitute',
    shape: TRIANGLE,
    shapes: [
      rect(0, 0, 1.8, 1, U),
      poly(
        [
          [0, 0.22],
          [1.0, 0.5],
          [0, 0.78]
        ],
        Y
      )
    ],
    meaning: 'Repeats the first flag of the group above it.'
  },
  {
    id: 'substitute-2',
    name: 'Second Substitute',
    shape: TRIANGLE,
    shapes: vStripes(1.8, [U, W]),
    meaning: 'Repeats the second flag of the group above it.'
  },
  {
    id: 'substitute-3',
    name: 'Third Substitute',
    shape: TRIANGLE,
    shapes: hStripes(1.8, [
      [W, 1 / 3],
      [K, 1 / 3],
      [W, 1 / 3]
    ]),
    meaning: 'Repeats the third flag of the group above it.'
  },
  {
    id: 'answering-pennant',
    name: 'Answering Pennant',
    shape: PENNANT,
    shapes: vStripes(1.8, [R, W, R, W, R]),
    meaning: 'Hoisted to answer a signal, and as the code pennant.'
  }
];

// ---- Drawing --------------------------------------------------------------

const n = (v) => {
  return Math.round(v * 100) / 100;
};
const pts = (points, map) => {
  return points
    .map(([x, y]) => {
      const [sx, sy] = map(x, y);
      return `${n(sx)},${n(sy)}`;
    })
    .join(' ');
};

const face = (flag, map, stroke) => {
  const outline = pts(flag.shape.outline, map);
  const parts = flag.shapes
    .map((s) => {
      return `<polygon points="${pts(s.points, map)}" fill="${s.fill}"/>`;
    })
    .join('');
  return (
    `<clipPath id="f"><polygon points="${outline}"/></clipPath>` +
    `<g clip-path="url(#f)">${parts}</g>` +
    `<polygon points="${outline}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`
  );
};

// Flat: the face front-on, flying from a staff at the left.
const flatSvg = (flag) => {
  const size = flag.shape.w > 1 ? 20 : 27;
  const x0 = 9;
  const y0 = 7;
  const map = (x, y) => {
    return [x0 + x * size, y0 + y * size];
  };
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
    `<rect x="6" y="5" width="3" height="39" fill="${STAFF}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
    face(flag, map, 1.2) +
    `<rect x="4" y="42" width="7" height="2.5" fill="${STAFF}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
    '</svg>'
  );
};

// Isometric: the face on the vertical plane through the staff that runs
// towards the viewer's right (the front-right face of a box), so a point
// (x, y) on the face is drawn at (x cos 30, x sin 30 + y).
const COS = Math.cos(Math.PI / 6);
const isoSvg = (flag) => {
  const size = flag.shape.w > 1 ? 21 : 26;
  const sx = 18;
  const top = 9;
  const map = (x, y) => {
    return [sx + x * size * COS, top + x * size * 0.5 + y * size];
  };
  // The staff: a slim upright on a round foot.
  const staff =
    `<ellipse cx="${sx}" cy="56" rx="7" ry="3.5" fill="${STAFF}" stroke="${INK}" stroke-width="1.4"/>` +
    `<rect x="${sx - 1.5}" y="${top - 3}" width="3" height="${56 - top + 3}" fill="${STAFF_TOP}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<circle cx="${sx}" cy="${top - 4}" r="2.2" fill="${STAFF}" stroke="${INK}" stroke-width="1.4"/>`;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    staff +
    face(flag, map, 1.4) +
    '</svg>'
  );
};

const detail = (flag) => {
  return {
    name: flag.name,
    family: 'marine-vehicle',
    description: flag.meaning,
    ports: [
      {
        id: 'hoist-top',
        name: 'Hoist top',
        medium: 'halyard',
        connector: 'snap-shackle'
      },
      {
        id: 'hoist-bottom',
        name: 'Hoist bottom',
        medium: 'halyard',
        connector: 'snap-shackle'
      }
    ]
  };
};

const main = () => {
  mkdirSync(out, { recursive: true });
  // pack.json lists the flags in signalling order: letters, numerals,
  // substitutes, then the answering pennant.
  const packFile = join(out, 'pack.json');
  const pack = JSON.parse(readFileSync(packFile, 'utf8'));
  pack.order = FLAGS.map((f) => {
    return f.id;
  });
  writeFileSync(packFile, JSON.stringify(pack, null, 2) + '\n');
  for (const file of readdirSync(out)) {
    if (file !== 'pack.json') rmSync(join(out, file));
  }
  for (const flag of FLAGS) {
    writeFileSync(join(out, `${flag.id}.iso.svg`), isoSvg(flag) + '\n');
    writeFileSync(join(out, `${flag.id}.flat.svg`), flatSvg(flag) + '\n');
    writeFileSync(
      join(out, `${flag.id}.json`),
      JSON.stringify(detail(flag), null, 2) + '\n'
    );
  }
  console.log(`${FLAGS.length} flags written to ${out}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
