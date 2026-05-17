import { Box } from '@mui/material';
import { ColorSwatch } from './ColorSwatch';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker = ({ value, onChange }: Props) => {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        width: 40,
        height: 40
      }}
    >
      <ColorSwatch hex={value} onClick={undefined} />
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.value);
        }}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer'
        }}
      />
    </Box>
  );
};
