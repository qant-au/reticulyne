import { useState, useRef, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useResizeObserver } from 'src/hooks/useResizeObserver';
import { Gradient } from 'src/components/Gradient/Gradient';
import { ExpandButton } from './ExpandButton';
import { Label, Props as LabelProps } from './Label';

type Props = Omit<LabelProps, 'maxHeight'> & {
  onToggleExpand?: (isExpanded: boolean) => void;
  /** Starts expanded. Remount (a new key) to apply a change. */
  initialExpanded?: boolean;
};

const STANDARD_LABEL_HEIGHT = 80;

export const ExpandableLabel = ({
  children,
  onToggleExpand,
  initialExpanded = false,
  ...rest
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { observe, size: contentSize } = useResizeObserver();

  useEffect(() => {
    if (!contentRef.current) return;

    observe(contentRef.current);
  }, [observe]);

  const containerMaxHeight = useMemo(() => {
    return isExpanded ? undefined : STANDARD_LABEL_HEIGHT;
  }, [isExpanded]);

  const isContentTruncated = useMemo(() => {
    return !isExpanded && contentSize.height >= STANDARD_LABEL_HEIGHT - 10;
  }, [isExpanded, contentSize.height]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [isExpanded]);

  return (
    <Label
      {...rest}
      maxHeight={containerMaxHeight}
      maxWidth={isExpanded ? rest.maxWidth * 1.5 : rest.maxWidth}
    >
      <Box
        ref={contentRef}
        sx={{
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
        style={{
          overflowY: isExpanded ? 'scroll' : 'hidden',
          maxHeight: containerMaxHeight
        }}
      >
        {children}

        {isContentTruncated && (
          <Gradient
            sx={{
              position: 'absolute',
              width: '100%',
              height: 50,
              bottom: 0,
              left: 0
            }}
          />
        )}
      </Box>

      {((!isExpanded && isContentTruncated) || isExpanded) && (
        <ExpandButton
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            m: 0.5,
            // A node's name lets the pointer through; its button must not.
            pointerEvents: 'auto'
          }}
          isExpanded={isExpanded}
          onClick={() => {
            setIsExpanded(!isExpanded);
            onToggleExpand?.(!isExpanded);
          }}
        />
      )}
    </Label>
  );
};
