// lw-064: the keys that step a running tour. Arrow keys advance, as the
// roadmap asked, with PageDown / PageUp (what a presentation clicker
// sends), Home / End for the ends, and Escape to leave. Space is not
// taken: holding it pans the canvas. A chord is never a tour key, so
// Alt+Up / Alt+Down still switch floors.

export type TourKeyAction = 'next' | 'previous' | 'first' | 'last' | 'end';

export const tourKeyAction = (e: KeyboardEvent): TourKeyAction | null => {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
      return 'next';
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      return 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'Escape':
      return 'end';
    default:
      return null;
  }
};
