import { useUiStateStore } from 'src/stores/uiStateStore';
import { Svg } from 'src/components/Svg/Svg';
import { TRANSFORM_CONTROLS_COLOR } from 'src/config';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { Coords } from 'src/types';

const strokeWidth = 2;

// 1.4: the visible rubber band. Split from the mode so the projection
// hook runs unconditionally (hooks cannot sit behind the mode check).
const Band = ({ from, to }: { from: Coords; to: Coords }) => {
  const { css, pxSize } = useIsoProjection({ from, to });

  return (
    <Svg style={{ ...css, pointerEvents: 'none' }}>
      <g transform={`translate(${strokeWidth}, ${strokeWidth})`}>
        <rect
          width={Math.max(pxSize.width - strokeWidth * 2, 0)}
          height={Math.max(pxSize.height - strokeWidth * 2, 0)}
          fill={TRANSFORM_CONTROLS_COLOR}
          fillOpacity={0.12}
          stroke={TRANSFORM_CONTROLS_COLOR}
          strokeDasharray={`${strokeWidth * 2} ${strokeWidth * 2}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    </Svg>
  );
};

export const MarqueeBand = () => {
  const mode = useUiStateStore((state) => {
    return state.mode;
  });

  if (mode.type !== 'MARQUEE') return null;

  return <Band from={mode.from} to={mode.to} />;
};
