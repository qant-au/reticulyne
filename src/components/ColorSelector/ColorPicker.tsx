import { useRef } from 'react';
import { Box } from '@mui/material';
import { ColorSwatch } from './ColorSwatch';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Names the control, e.g. "Background color". */
  label?: string;
}

// The swatch is the control: pressing it opens the browser's colour picker.
// The native input used to lie over the swatch at opacity 0, unlabelled, so
// it took every click and the labelled swatch could not be pressed by
// assistive tech or automation (sweep 2026-09-30). It now sits under the
// swatch, out of the tab order and the pointer's way, only so the picker
// opens there.
export const ColorPicker = ({ value, onChange, label }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        width: 40,
        height: 40
      }}
    >
      <Box
        component="input"
        ref={inputRef}
        type="color"
        value={value}
        tabIndex={-1}
        aria-label={label ?? 'Colour'}
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
          pointerEvents: 'none'
        }}
      />
      <ColorSwatch
        hex={value}
        label={label ? `${label} ${value}` : undefined}
        onClick={() => {
          inputRef.current?.click();
        }}
      />
    </Box>
  );
};
