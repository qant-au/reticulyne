// The colour shading the editor does with chroma-js (getColorVariant in
// src/utils/common.ts, and chroma(colour).alpha()), without chroma-js. The
// maths is chroma-js 3's: sRGB to CIE Lab (D65, with its Bradford
// adaptation), darken by 18 L per grade, saturate by 18 C per grade in LCh,
// back to sRGB clipped to 0-255, written as chroma's css() writes it. The
// tests check the output against chroma-js itself.

type Rgba = [number, number, number, number];

const Kn = 18;
const Xn = 0.95047;
const Yn = 1;
const Zn = 1.08883;
const kE = 216 / 24389;
const kK = 24389 / 27;
const kKE = 8;

// sRGB <-> XYZ and the Bradford adaptation matrices, as chroma-js has them.
const M_RGB_XYZ = [
  0.4124564390896922, 0.21267285140562253, 0.0193338955823293,
  0.357576077643909, 0.715152155287818, 0.11919202588130297,
  0.18043748326639894, 0.07217499330655958, 0.9503040785363679
];
const M_XYZ_RGB = [
  3.2404541621141045, -0.9692660305051868, 0.055643430959114726,
  -1.5371385127977166, 1.8760108454466942, -0.2040259135167538,
  -0.498531409556016, 0.041556017530349834, 1.0572251882231791
];
const MA = [
  0.8951, -0.7502, 0.0389, 0.2664, 1.7135, -0.0685, -0.1614, 0.0367, 1.0296
];
const MA_I = [
  0.9869929054667123, 0.43230526972339456, -0.008528664575177328,
  -0.14705425642099013, 0.5183602715367776, 0.04004282165408487,
  0.15996265166373125, 0.0492912282128556, 0.9684866957875502
];
const As = 0.9414285350000001;
const Bs = 1.040417467;
const Cs = 1.089532651;

// m is column-major as chroma names it: m[0..2] = m00, m01, m02.
const apply = (m: number[], x: number, y: number, z: number) => {
  return [
    x * m[0] + y * m[3] + z * m[6],
    x * m[1] + y * m[4] + z * m[7],
    x * m[2] + y * m[5] + z * m[8]
  ];
};

const whiteCone = (wx: number, wy: number, wz: number) => {
  return apply(MA, wx, wy, wz);
};

const linear = (c: number) => {
  const sign = Math.sign(c);
  const v = Math.abs(c);
  return (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) * sign;
};

const compand = (c: number) => {
  const sign = Math.sign(c);
  const v = Math.abs(c);
  return (
    (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * sign
  );
};

const rgbToLab = (r: number, g: number, b: number) => {
  const [x0, y0, z0] = apply(
    M_RGB_XYZ,
    linear(r / 255),
    linear(g / 255),
    linear(b / 255)
  );
  const [Ad, Bd, Cd] = whiteCone(Xn, Yn, Zn);
  const [X, Y, Z] = apply(MA, x0, y0, z0);
  const [x, y, z] = apply(MA_I, (X * Ad) / As, (Y * Bd) / Bs, (Z * Cd) / Cs);
  const f = (t: number) => {
    return t > kE ? Math.cbrt(t) : (kK * t + 16) / 116;
  };
  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labToRgb = (L: number, a: number, b: number) => {
  const fy = (L + 16) / 116;
  const fx = 0.002 * a + fy;
  const fz = fy - 0.005 * b;
  const fx3 = fx * fx * fx;
  const fz3 = fz * fz * fz;
  const x = (fx3 > kE ? fx3 : (116 * fx - 16) / kK) * Xn;
  const y = (L > kKE ? Math.pow((L + 16) / 116, 3) : L / kK) * Yn;
  const z = (fz3 > kE ? fz3 : (116 * fz - 16) / kK) * Zn;
  const [aS, bS, cS] = whiteCone(Xn, Yn, Zn);
  const [aD, bD, cD] = whiteCone(0.95047, 1, 1.08883);
  const [X1, Y1, Z1] = apply(MA, x, y, z);
  const [X2, Y2, Z2] = apply(
    MA_I,
    X1 * (aD / aS),
    Y1 * (bD / bS),
    Z1 * (cD / cS)
  );
  const [r, g, bl] = apply(M_XYZ_RGB, X2, Y2, Z2);
  return [compand(r) * 255, compand(g) * 255, compand(bl) * 255];
};

const clip = (rgba: number[]): Rgba => {
  return [
    Math.min(255, Math.max(0, rgba[0])),
    Math.min(255, Math.max(0, rgba[1])),
    Math.min(255, Math.max(0, rgba[2])),
    Math.min(1, Math.max(0, rgba[3]))
  ];
};

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

/** A colour as [r, g, b, a], or null when it is not hex or rgb(). */
export const parseColor = (color: string): Rgba | null => {
  const text = color.trim();
  const hex = HEX.exec(text);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) {
      h = h
        .split('')
        .map((c) => {
          return c + c;
        })
        .join('');
    }
    const n = (i: number) => {
      return parseInt(h.slice(i, i + 2), 16);
    };
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = RGB_FN.exec(text);
  if (fn) {
    const alpha = fn[4]
      ? fn[4].endsWith('%')
        ? parseFloat(fn[4]) / 100
        : parseFloat(fn[4])
      : 1;
    return clip([Number(fn[1]), Number(fn[2]), Number(fn[3]), alpha]);
  }
  return null;
};

/** As chroma-js's css(): rgb(r g b), or rgb(r g b / a) below full alpha. */
export const toCss = ([r, g, b, a]: Rgba) => {
  const rgb = `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
  return a < 1 ? `rgb(${rgb} / ${a})` : `rgb(${rgb})`;
};

const darken = ([r, g, b, a]: Rgba, amount: number): Rgba => {
  const [L, A, B] = rgbToLab(r, g, b);
  return clip([...labToRgb(L - Kn * amount, A, B), a]);
};

const saturate = ([r, g, b, a]: Rgba, amount: number): Rgba => {
  const [L, A, B] = rgbToLab(r, g, b);
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  h = (h + 360) % 360;
  if (Math.round(c * 10000) === 0) h = 0;
  const c2 = Math.max(0, c + Kn * amount);
  const rad = (h * Math.PI) / 180;
  return clip([...labToRgb(L, Math.cos(rad) * c2, Math.sin(rad) * c2), a]);
};

/** chroma(color).alpha(alpha).css(); the colour unchanged if unreadable. */
export const withAlpha = (color: string, alpha: number) => {
  const rgba = parseColor(color);
  if (!rgba) return color;
  return toCss([rgba[0], rgba[1], rgba[2], Math.min(1, Math.max(0, alpha))]);
};

/** The editor's getColorVariant, without chroma-js. */
export const getColorVariant = (
  color: string,
  variant: 'light' | 'dark',
  { alpha = 1, grade = 1 }: { alpha?: number; grade?: number } = {}
) => {
  const rgba = parseColor(color);
  if (!rgba) return color;
  const shaded =
    variant === 'light'
      ? darken(rgba, -grade)
      : saturate(darken(rgba, grade), grade);
  shaded[3] = Math.min(1, Math.max(0, alpha));
  return toCss(shaded);
};
