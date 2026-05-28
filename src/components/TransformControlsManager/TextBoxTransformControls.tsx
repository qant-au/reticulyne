import { useMemo } from 'react';
import { getTextBoxEndTile } from 'src/utils';
import { useTextBox } from 'src/hooks/useTextBox';
import { TransformControls } from './TransformControls';

interface Props {
  id: string;
}

export const TextBoxTransformControls = ({ id }: Props) => {
  const textBox = useTextBox(id);

  const to = useMemo(() => {
    if (!textBox) return null;
    return getTextBoxEndTile(textBox, textBox.size);
  }, [textBox]);

  if (!textBox || !to) return null;

  return <TransformControls from={textBox.tile} to={to} />;
};
