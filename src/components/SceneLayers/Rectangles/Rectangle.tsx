import chroma from 'chroma-js';
import { Box } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { getColorVariant } from 'src/utils';
import { useColor } from 'src/hooks/useColor';

type SceneRectangle = ReturnType<typeof useScene>['rectangles'][0];
type Props = SceneRectangle & { isDimmed?: boolean };

export const Rectangle = ({
  from,
  to,
  color: colorId,
  colorValue,
  outlineColor,
  transparency,
  isDimmed
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
    <Box style={{ opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.3s' }}>
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
    </Box>
  );
};
