import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HexField, normaliseHex } from '../HexField';

describe('normaliseHex', () => {
  test('accepts #rgb and #rrggbb, with or without #, as lower-case #rrggbb', () => {
    expect(normaliseHex('#F0a')).toBe('#ff00aa');
    expect(normaliseHex('ff8800')).toBe('#ff8800');
    expect(normaliseHex(' #FF8800 ')).toBe('#ff8800');
  });

  test('refuses anything else', () => {
    expect(normaliseHex('#ff88')).toBeNull();
    expect(normaliseHex('#ff880011')).toBeNull();
    expect(normaliseHex('red')).toBeNull();
  });
});

const Harness = ({ onCommit }: { onCommit: (v?: string) => void }) => {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <HexField
      label="Fill hex override"
      value={value}
      placeholder="#aabbcc"
      onChange={(v) => {
        onCommit(v);
        setValue(v);
      }}
    />
  );
};

describe('HexField', () => {
  test('a value typed one key at a time is kept and applied at six digits', () => {
    const onCommit = jest.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText(
      'Fill hex override'
    ) as HTMLInputElement;
    let typed = '';
    for (const ch of '#ff8800') {
      typed += ch;
      fireEvent.change(input, { target: { value: typed } });
      expect(input.value).toBe(typed);
    }
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith('#ff8800');
  });

  test('#rgb applies on blur; an invalid value is flagged and put back', () => {
    const onCommit = jest.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText(
      'Fill hex override'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#f0a' } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith('#ff00aa');
    expect(input.value).toBe('#ff00aa');

    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.blur(input);
    expect(input.value).toBe('#ff00aa');
    expect(screen.getByText('Use #rgb or #rrggbb')).toBeTruthy();
  });
});
