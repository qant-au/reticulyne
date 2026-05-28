import { useMemo } from 'react';
import { getItemById } from 'src/utils';
import { useScene } from 'src/hooks/useScene';

export const useTextBox = (id: string) => {
  const { textBoxes } = useScene();

  const textBox = useMemo(() => {
    // A deleted text box's component goes through one final render cycle
    // before unmounting. Return null rather than throwing so the component
    // can bail out cleanly instead of hitting IsoflowErrorBoundary.
    return getItemById(textBoxes, id);
  }, [textBoxes, id]);

  return textBox;
};
