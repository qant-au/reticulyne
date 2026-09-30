import {
  CUT_MIN_CHARS,
  ceilPx,
  planFloorTabs,
  type FloorTabMeasure
} from '../floorTabsLayout';

// Sweep 2026-09-30, round 5: three phone title-bar defects in the floor
// tabs, each measured in Chromium at 390 / 430 wide. Widths here are the
// measured ones: body2 600 weight, 16px padding, 4px between tabs.
const PAD = 16;
const GAP = 4;
const ground = { id: 'g', full: ceilPx(61.33), cut: ceilPx(22.4 + 8.9) };
const level1 = { id: 'l1', full: ceilPx(60.13), cut: ceilPx(21.9 + 8.9) };
const lab = { id: 'lab', full: ceilPx(20.42), cut: ceilPx(20.42 + 8.9) };
const tabs: FloorTabMeasure[] = [ground, level1, lab];

const plan = (room: number, t = tabs) => {
  return planFloorTabs({ room, tabs: t, activeId: 'g', pad: PAD, gap: GAP });
};
const allFull = (t: FloorTabMeasure[]) => {
  return (
    t.reduce((s, x) => {
      return s + x.full + PAD;
    }, 0) +
    GAP * (t.length - 1)
  );
};

describe('planFloorTabs', () => {
  // (a) "Ground net" drew "Ground ..." in a box 61.20px wide for 61.33px of
  // text: a sub-pixel shortfall.
  test('(a) text widths round up, so a name that fits is never cut', () => {
    expect(ceilPx(61.33)).toBe(62);
    expect(ceilPx(61)).toBe(61);
    expect(ceilPx(60.0000001)).toBe(60);
    const p = plan(allFull(tabs));
    expect(p.collapsed).toBe(false);
    for (const t of tabs) expect(p.widths[t.id]).toBe(t.full + PAD);
    // The shown tab's box always holds its whole (rounded-up) text.
    expect(p.widths.g - PAD).toBeGreaterThanOrEqual(61.33);
  });

  test('(a) the shown floor keeps its full width while others are cut', () => {
    const p = plan(allFull(tabs) - 20);
    expect(p.collapsed).toBe(false);
    expect(p.widths.g).toBe(ground.full + PAD);
    const sum =
      Object.values(p.widths).reduce((s, w) => {
        return s + w;
      }, 0) +
      GAP * 2;
    expect(sum).toBeLessThanOrEqual(allFull(tabs) - 20);
  });

  // (b) "Level 1 net" and "Lab" both read "L...".
  test(`(b) a cut tab keeps ${CUT_MIN_CHARS} letters and an ellipsis`, () => {
    for (let room = 0; room <= allFull(tabs) + 10; room += 0.25) {
      const p = plan(room);
      if (p.collapsed) continue;
      expect(p.widths.l1).toBeGreaterThanOrEqual(level1.cut + PAD);
      // "Lab" is no longer than its cut form: never cut.
      expect(p.widths.lab).toBe(lab.full + PAD);
    }
  });

  test('(b) it collapses when the tabs cannot keep that minimum', () => {
    const least = ground.full + level1.cut + lab.full + 3 * PAD + 2 * GAP;
    expect(plan(least).collapsed).toBe(false);
    expect(plan(least - 0.5).collapsed).toBe(true);
  });

  // (c) At 430 the shown floor read "Gr..." beside two "L..." while at 390
  // the tabs collapsed and showed it whole.
  test('(c) the shown floor is never cut while the tabs are out', () => {
    let seenOut = false;
    for (let room = 0; room <= allFull(tabs) + 10; room += 0.25) {
      const p = plan(room);
      // More room never collapses tabs that were out.
      if (seenOut) expect(p.collapsed).toBe(false);
      if (!p.collapsed) {
        seenOut = true;
        expect(p.widths.g).toBe(ground.full + PAD);
      }
    }
    expect(seenOut).toBe(true);
  });

  test('(c) with room for only a cut shown floor, the tabs collapse', () => {
    // Room enough for every tab at a letter or two (the old behaviour cut
    // the shown floor to "Gr..." here), not for the shown floor whole.
    expect(plan(3 * (PAD + 12) + 2 * GAP).collapsed).toBe(true);
  });
});
