// How the floor tabs share the room the title bar gives them (sweep
// 2026-09-30, round 5). Worked out from measured text widths rather than
// left to flex shrinking, which got three things wrong on a phone:
//  (a) the shown floor drew an ellipsis ("Ground ...") in a box 61.20px wide
//      for 61.33px of text - a sub-pixel shortfall passed on to it;
//  (b) the other floors all shrank to one letter ("L...", "L..."), so two
//      cut tabs read the same;
//  (c) the shown floor was cut ("Gr...") at 430 while at 390 the tabs
//      collapsed to the options menu and showed it whole.
// So: text widths are rounded up; the shown floor is never cut while the
// tabs are out; a floor not shown keeps at least CUT_MIN_CHARS letters and
// an ellipsis; and when that cannot fit, the tabs collapse.

/** Letters a cut tab keeps, before its ellipsis. */
export const CUT_MIN_CHARS = 3;

/** A width in CSS pixels rounded up, so text that fits is never cut. */
export const ceilPx = (width: number) => {
  // A hair under a whole pixel is floating-point noise, not a shortfall.
  return Math.ceil(width - 0.001);
};

export interface FloorTabMeasure {
  id: string;
  /** The name's text width, rounded up. */
  full: number;
  /** The width of the first CUT_MIN_CHARS letters and an ellipsis, rounded up. */
  cut: number;
}

export interface FloorTabsPlan {
  /** The tabs do not fit: show the shown floor alone, the rest in the menu. */
  collapsed: boolean;
  /** Each tab's box width (text plus padding), by floor id. */
  widths: Record<string, number>;
}

export const planFloorTabs = ({
  room,
  tabs,
  activeId,
  pad,
  gap
}: {
  /** The width the tab list has. */
  room: number;
  tabs: FloorTabMeasure[];
  activeId: string;
  /** A tab's horizontal padding, both sides together. */
  pad: number;
  /** The space between two tabs. */
  gap: number;
}): FloorTabsPlan => {
  const gaps = gap * Math.max(0, tabs.length - 1);
  const full = (t: FloorTabMeasure) => {
    return t.full + pad;
  };
  // A name no longer than its cut form is never cut.
  const least = (t: FloorTabMeasure) => {
    return t.id === activeId ? full(t) : Math.min(t.full, t.cut) + pad;
  };
  const widths: Record<string, number> = {};
  const total =
    tabs.reduce((sum, t) => {
      return sum + full(t);
    }, 0) + gaps;
  if (total <= room) {
    for (const t of tabs) widths[t.id] = full(t);
    return { collapsed: false, widths };
  }
  const floor =
    tabs.reduce((sum, t) => {
      return sum + least(t);
    }, 0) + gaps;
  if (floor > room) {
    return { collapsed: true, widths: {} };
  }
  // The floors not shown give way, each in proportion to what it can give.
  const give = total - floor;
  const need = total - room;
  for (const t of tabs) {
    const w = full(t);
    // Rounded down to a hundredth, so the tabs never sum past the room.
    widths[t.id] = Math.floor((w - ((w - least(t)) * need) / give) * 100) / 100;
  }
  return { collapsed: false, widths };
};
