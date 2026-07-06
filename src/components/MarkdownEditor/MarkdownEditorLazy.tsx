// PRF-11: lazy split for TipTap (@tiptap/react + prosemirror).
//
// MarkdownEditor is the single heaviest dependency in the entry
// bundle. It's rendered inline at two sites (Node description label,
// NodeSettings description editor), so the lazy import is wrapped in a
// plain-text fallback rather than null — the fallback renders the raw
// value inside the same outer container shape MarkdownEditor uses, so
// there's no layout jump while the chunk is fetched.
import React, { Suspense, lazy, useMemo } from 'react';
import { Box } from '@mui/material';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number;
  styles?: React.CSSProperties;
}

const MarkdownEditorImpl = lazy(() => {
  return import('./MarkdownEditor').then((m) => {
    return { default: m.MarkdownEditor };
  });
});

// Strip editor-emitted HTML down to plain text for the fallback. The
// stored values are HTML strings; for the brief moment before the editor
// hydrates, we render the textual content instead of raw markup.
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const PlainTextFallback = ({
  value,
  height,
  styles
}: Pick<Props, 'value' | 'height' | 'styles'>) => {
  const text = useMemo(() => {
    if (!value) return '';
    return stripHtml(value);
  }, [value]);
  return (
    <Box
      sx={{
        minHeight: height ?? 120,
        color: 'text.secondary',
        whiteSpace: 'pre-wrap',
        ...styles
      }}
    >
      {text}
    </Box>
  );
};

export const MarkdownEditor = (props: Props) => {
  return (
    <Suspense
      fallback={
        <PlainTextFallback
          value={props.value}
          height={props.height}
          styles={props.styles}
        />
      }
    >
      <MarkdownEditorImpl {...props} />
    </Suspense>
  );
};
