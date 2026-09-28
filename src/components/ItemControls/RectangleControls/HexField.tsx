import { useState } from 'react';
import { TextField } from '@mui/material';

// #rgb or #rrggbb, the # optional. Returns the lower-case #rrggbb form,
// or null when the text is not a colour.
export const normaliseHex = (text: string): string | null => {
  const v = text.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v
      .split('')
      .map((c) => {
        return c + c;
      })
      .join('')}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`.toLowerCase();
  return null;
};

interface Props {
  label: string;
  value: string | undefined;
  /** What applies while the field is empty (the swatch's colour). */
  placeholder: string;
  onChange: (value: string | undefined) => void;
}

// A hex override edited as text. The field used to be bound straight to
// the model and accept only a complete #rrggbb, so every keystroke of one
// being typed was thrown away and the field stayed empty. Now it holds a
// draft: six digits apply as they are reached, #rgb applies on blur, an
// empty field clears the override, and anything else is flagged on blur
// and put back.
export const HexField = ({ label, value, placeholder, onChange }: Props) => {
  const [draft, setDraft] = useState(value ?? '');
  const [invalid, setInvalid] = useState(false);
  // Follow the model when it changes from elsewhere (undo, a swatch).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value ?? '');
    setInvalid(false);
  }

  return (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      value={draft}
      error={invalid}
      helperText={invalid ? 'Use #rgb or #rrggbb' : undefined}
      slotProps={{ inputLabel: { shrink: true } }}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        setInvalid(false);
        if (text.trim() === '') {
          onChange(undefined);
          return;
        }
        // Only a full six digits applies while typing: #ff8 is also the
        // start of #ff8800, and applying it would rewrite the field.
        const hex = normaliseHex(text);
        if (hex && text.replace(/^\s*#?/, '').trim().length === 6) {
          if (hex !== value) onChange(hex);
        }
      }}
      onBlur={() => {
        if (draft.trim() === '') return;
        const hex = normaliseHex(draft);
        if (hex) {
          if (hex !== value) onChange(hex);
          return;
        }
        setInvalid(true);
        setDraft(value ?? '');
      }}
    />
  );
};
