import React, { useEffect, useMemo } from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor
} from '@tiptap/react';
import { generateHTML, generateJSON } from '@tiptap/html';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import { sanitizeLinkUrl, SANITIZED_URL } from './sanitizeLinkUrl';

// SafeLink routes every `href` through the existing `sanitizeLinkUrl` on both
// directions — `parseHTML` when incoming `value`-prop HTML is parsed into the
// document, and `renderHTML` when the document is serialised back out — so
// `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` URLs never reach
// the DOM. This reuses the same guard the old Quill Link-blot override used
// (see SECURITY.md, DEP-04-follow-up).
export const SafeLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element) => {
          return sanitizeLinkUrl(element.getAttribute('href'));
        },
        renderHTML: (attributes) => {
          return attributes.href
            ? { href: sanitizeLinkUrl(attributes.href) }
            : {};
        }
      }
    };
  }
}).configure({
  openOnClick: false,
  autolink: false,
  HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' }
});

// The ProseMirror schema is the XSS boundary (see SECURITY.md). Registering
// only these primitives means `generateJSON`/`generateHTML` drop every
// unknown tag and attribute (`<img onerror>`, `<iframe>`, `<script>`,
// `<style>`, ...) on the way in AND on the way out. Widening this set (e.g.
// adding an image or raw-HTML extension) reopens vectors the current design
// closes and must be paired with a re-assessment of that guarantee.
export const EDITOR_EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Underline,
  Strike,
  SafeLink
];

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number;
  styles?: React.CSSProperties;
}

const Toolbar = ({ editor }: { editor: Editor }) => {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        link: e.isActive('link')
      };
    }
  });

  const setLink = () => {
    const previous = (editor.getAttributes('link').href as string) ?? '';
    const input = window.prompt('Link URL', previous);
    if (input === null) return;
    const href = sanitizeLinkUrl(input);
    if (!input.trim() || href === SANITIZED_URL) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
      <IconButton
        size="small"
        aria-label="Bold"
        color={active.bold ? 'primary' : 'default'}
        onClick={() => {
          return editor.chain().focus().toggleBold().run();
        }}
      >
        <FormatBoldIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Italic"
        color={active.italic ? 'primary' : 'default'}
        onClick={() => {
          return editor.chain().focus().toggleItalic().run();
        }}
      >
        <FormatItalicIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Underline"
        color={active.underline ? 'primary' : 'default'}
        onClick={() => {
          return editor.chain().focus().toggleUnderline().run();
        }}
      >
        <FormatUnderlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Strikethrough"
        color={active.strike ? 'primary' : 'default'}
        onClick={() => {
          return editor.chain().focus().toggleStrike().run();
        }}
      >
        <FormatStrikethroughIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Link"
        color={active.link ? 'primary' : 'default'}
        onClick={setLink}
      >
        <InsertLinkIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};

const EditableMarkdown = ({ value, onChange, height = 120, styles }: Props) => {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: value ?? '',
    onUpdate: ({ editor: e }) => {
      return onChange?.(e.getHTML());
    }
  });

  // Sync external `value` changes (e.g. selecting a different node) into the
  // editor without clobbering the caret while the user is typing — only reset
  // when the incoming value differs from what the editor already holds.
  useEffect(() => {
    if (!editor) return;
    const next = value ?? '';
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <Box>
      {editor && <Toolbar editor={editor} />}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1.5,
          color: 'text.secondary',
          height,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
          '.ProseMirror': { outline: 'none', minHeight: '100%' },
          '.ProseMirror p': { m: 0 },
          ...styles
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

const ReadOnlyMarkdown = ({
  value,
  styles
}: Pick<Props, 'value' | 'styles'>) => {
  // Regenerate the display HTML purely from the schema. `generateJSON` drops
  // any tag/attribute outside EDITOR_EXTENSIONS and every href is
  // sanitised, so `html` can only contain the five allowed marks — the input
  // string never passes through untouched. This is the one place
  // dangerouslySetInnerHTML is provably safe.
  const html = useMemo(() => {
    return generateHTML(
      generateJSON(value ?? '', EDITOR_EXTENSIONS),
      EDITOR_EXTENSIONS
    );
  }, [value]);

  return (
    <Box
      className="reticulyne-markdown-view"
      sx={{ color: 'text.secondary', '& p': { m: 0 }, ...styles }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const MarkdownEditor = ({
  value,
  onChange,
  readOnly,
  height,
  styles
}: Props) => {
  if (readOnly) return <ReadOnlyMarkdown value={value} styles={styles} />;

  return (
    <EditableMarkdown
      value={value}
      onChange={onChange}
      height={height}
      styles={styles}
    />
  );
};
