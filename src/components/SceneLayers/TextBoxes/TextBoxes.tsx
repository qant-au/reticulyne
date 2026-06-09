import { memo, useMemo } from 'react';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { useSceneTextBoxesList } from 'src/hooks/sceneLists';
import { TextBox } from './TextBox';

export const TextBoxes = memo(() => {
  const textBoxes = useSceneTextBoxesList();
  const activeHighlightId = useActiveHighlightId();

  const ordered = useMemo(() => {
    return [...textBoxes].reverse();
  }, [textBoxes]);

  return (
    <>
      {ordered.map((textBox) => {
        return (
          <TextBox
            key={textBox.id}
            textBox={textBox}
            isDimmed={
              activeHighlightId !== null && activeHighlightId !== textBox.id
            }
          />
        );
      })}
    </>
  );
});

TextBoxes.displayName = 'TextBoxes';
