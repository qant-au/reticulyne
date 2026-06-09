import { useMemo } from 'react';
import { DEFAULT_COLOR } from 'src/config';
import { useScene } from 'src/hooks/useScene';

export const useColor = (colorId?: string) => {
  const { colors } = useScene();

  const color = useMemo(() => {
    if (colorId === undefined) {
      // Empty palette is valid input (colors is unbounded zod-side); fall
      // back to the built-in DEFAULT_COLOR rather than throwing, which
      // would surface through ReticulyneErrorBoundary and replace the
      // whole editor with the failure UI.
      return colors[0] ?? DEFAULT_COLOR;
    }

    const found = colors.find((c) => {
      return c.id === colorId;
    });

    return found ?? colors[0] ?? DEFAULT_COLOR;
  }, [colorId, colors]);

  return color;
};
