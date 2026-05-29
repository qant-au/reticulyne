import { useScene } from 'src/hooks/useScene';
import { useActiveHighlightId } from 'src/hooks/useActiveHighlightId';
import { TextBox } from './TextBox';

interface Props {
  textBoxes: ReturnType<typeof useScene>['textBoxes'];
}

export const TextBoxes = ({ textBoxes }: Props) => {
  const activeHighlightId = useActiveHighlightId();

  return (
    <>
      {[...textBoxes].reverse().map((textBox) => {
        return (
          <TextBox
            key={textBox.id}
            textBox={textBox}
            isDimmed={activeHighlightId !== null && activeHighlightId !== textBox.id}
          />
        );
      })}
    </>
  );
};
