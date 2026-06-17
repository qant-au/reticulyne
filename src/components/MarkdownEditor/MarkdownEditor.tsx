import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import { Box } from '@mui/material';
import {
  ALLOWED_LINK_PROTOCOLS,
  SANITIZED_URL,
  sanitizeLinkUrl
} from './sanitizeLinkUrl';

// Module-level: restrict Quill's Link blot to safe URL protocols so
// javascript:, data:, vbscript: etc. are replaced with about:blank in
// both user-edited content and value-prop-supplied content.
const QuillLink = Quill.import('formats/link') as {
  sanitize: (url: string) => string;
  PROTOCOL_WHITELIST: string[];
  SANITIZED_URL: string;
};
QuillLink.PROTOCOL_WHITELIST = ALLOWED_LINK_PROTOCOLS;
QuillLink.SANITIZED_URL = SANITIZED_URL;
QuillLink.sanitize = sanitizeLinkUrl;

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number;
  styles?: React.CSSProperties;
}

// The Quill format allowlist. Load-bearing for XSS containment (see
// SECURITY.md): Quill strips any format not in this list when parsing
// `value`-prop HTML, so `<img>`/`<script>`/etc. carrying `onerror` and
// friends never reach the DOM. Exported so the sanitisation can be
// asserted directly (QUA-08).
export const EDITOR_FORMATS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'link'
];

export const MarkdownEditor = ({
  value,
  onChange,
  readOnly,
  height = 120,
  styles
}: Props) => {
  const modules = useMemo(() => {
    if (!readOnly)
      return {
        toolbar: EDITOR_FORMATS
      };

    return { toolbar: false };
  }, [readOnly]);

  return (
    <Box
      sx={{
        '.ql-toolbar.ql-snow': {
          border: 'none',
          pt: 0,
          px: 0
        },
        '.ql-toolbar.ql-snow + .ql-container.ql-snow': {
          border: '1px solid',
          borderColor: 'grey.300',
          borderTop: 'auto',
          borderRadius: 1.5,
          height,
          color: 'text.secondary'
        },
        '.ql-container.ql-snow': {
          ...(readOnly ? { border: 'none' } : {}),
          ...styles
        },
        '.ql-editor': {
          ...(readOnly ? { p: 0 } : {})
        }
      }}
    >
      <ReactQuill
        theme="snow"
        value={value ?? ''}
        readOnly={readOnly}
        onChange={onChange}
        formats={EDITOR_FORMATS}
        modules={modules}
      />
    </Box>
  );
};
