import chroma from 'chroma-js';
import { useScene } from 'src/hooks/useScene';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { getColorVariant } from 'src/utils';
import { useColor } from 'src/hooks/useColor';

type Props = ReturnType<typeof useScene>['rectangles'][0];

export const Rectangle = ({
  from,
  to,
  color: colorId,
  colorValue,
  outlineColor,
  transparency
}: Props) => {
  const paletteColor = useColor(colorId);

  const resolvedHex = colorValue ?? paletteColor.value;

  let fill = resolvedHex;
  if (transparency !== undefined && transparency > 0) {
    try {
      fill = chroma(resolvedHex)
        .alpha(1 - transparency)
        .css();
    } catch {
      // invalid hex that bypassed the schema — fall back to opaque
    }
  }

  const strokeColor =
    outlineColor ?? getColorVariant(resolvedHex, 'dark', { grade: 2 });

  return (
    <IsoTileArea
      from={from}
      to={to}
      fill={fill}
      cornerRadius={22}
      stroke={{
        color: strokeColor,
        width: 1
      }}
    />
  );
};
