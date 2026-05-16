import {
  MuiColorButtonProps,
  MuiColorInput,
  MuiColorInputProps
} from 'mui-color-input';
import { ColorSwatch } from './ColorSwatch';

type Props = Omit<MuiColorInputProps, 'ref'>;

const ColorButtonElement = ({ bgColor, onClick }: MuiColorButtonProps) => {
  return <ColorSwatch hex={bgColor} onClick={onClick} />;
};
export const ColorPicker = ({ value, onChange }: Props) => {
  return (
    <MuiColorInput
      size="small"
      variant="standard"
      format="hex"
      value={value}
      onChange={onChange}
      InputProps={{ disableUnderline: true, type: 'hidden' }}
      Adornment={ColorButtonElement}
    />
  );
};
