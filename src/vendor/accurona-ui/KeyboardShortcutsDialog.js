import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { AppDialog } from './AppDialog.js';
import { keyNames, shortcutKeys } from './shortcutKeys.js';
const Kbd = ({ children }) => (_jsx(Box, { component: "kbd", sx: {
        fontFamily: 'inherit',
        fontSize: '0.8125rem',
        px: 0.75,
        py: 0.125,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        whiteSpace: 'nowrap'
    }, children: children }));
const Joiner = ({ children }) => (_jsx(Box, { component: "span", sx: { color: 'text.secondary', fontSize: '0.75rem' }, children: children }));
const Words = ({ children }) => (_jsx(Box, { component: "span", sx: { color: 'text.secondary', fontSize: '0.8125rem' }, children: children }));
// One +-joined part of a chord or gesture: a key, or a key and words.
const Part = ({ part }) => (_jsx(_Fragment, { children: part.map((piece, i) => 'key' in piece ? _jsx(Kbd, { children: piece.key }, i) : _jsx(Words, { children: piece.text }, i)) }));
// Each entry is one way to trigger the action, so entries are separated by
// "or"; the keys of one chord are joined by "+". Without that, "V 1 S" and
// "⌘ ⇧ Z" were drawn alike and read as one combination (BUG15-14). A
// pointer gesture draws its keys as keys too ("⇧ + Click"), as the keyboard
// rows do: they were a mix of chips and plain text (sweep 2026-09-30). A
// row of chords keeps its alternatives on one line beside the label: wrapped,
// the second one started a line with "or" (on a phone they may wrap under
// the label). A row with words in it may wrap, and then "or" ends the line
// rather than starting the next.
const Keys = ({ keys }) => {
    const entries = keys.map((entry) => ({ entry, parsed: shortcutKeys(entry) }));
    const chordsOnly = entries.every((e) => e.parsed.kind === 'chord');
    return (_jsx(Box, { component: "span", sx: {
            display: 'inline-flex',
            flexWrap: chordsOnly ? { xs: 'wrap', sm: 'nowrap' } : 'wrap',
            alignItems: 'center',
            gap: 0.5,
            justifyContent: { xs: 'flex-start', sm: 'flex-end' }
        }, children: entries.map(({ entry, parsed }, i) => {
            const parts = parsed.kind === 'chord' ? parsed.keys.map((key) => [{ key }]) : parsed.kind === 'gesture' ? parsed.parts : [];
            return (_jsxs(Box, { component: "span", sx: { display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }, children: [parsed.kind === 'text' ? (_jsx(Box, { component: "span", sx: { color: 'text.secondary', fontSize: '0.8125rem', whiteSpace: 'normal' }, children: parsed.text })) : (parts.map((part, j) => (_jsxs(Box, { component: "span", sx: { display: 'inline-flex', alignItems: 'center', gap: 0.5 }, children: [j > 0 && _jsx(Joiner, { children: "+" }), _jsx(Part, { part: part })] }, j)))), i < entries.length - 1 && _jsx(Joiner, { children: "or" })] }, entry));
        }) }));
};
// On a phone the keys go under their label rather than beside it, where
// they were pushed off the dialog's right edge.
const rowSx = { display: { xs: 'block', sm: 'table-row' }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider', py: { xs: 0.75, sm: 0 } };
const labelCellSx = { display: { xs: 'block', sm: 'table-cell' }, borderBottom: { xs: 0 }, p: { xs: 0 }, pb: { xs: 0.5 } };
// Up to half the width beside the label, so a long phrase wraps instead of
// squeezing the label to a word a line.
const keysCellSx = { display: { xs: 'block', sm: 'table-cell' }, borderBottom: { xs: 0 }, p: { xs: 0 }, width: { sm: '50%' }, textAlign: { xs: 'left', sm: 'right' } };
// The `?` dialog: every binding a tool has, from the shared keymap, and the
// Excalidraw bindings it deliberately does not match.
export const KeyboardShortcutsDialog = ({ open, onClose, sections, differences, title = 'Keyboard shortcuts' }) => (_jsx(AppDialog, { open: open, onClose: onClose, title: title, maxWidth: "md", children: _jsxs(Stack, { spacing: 3, "data-testid": "keyboard-shortcuts", children: [_jsx(Box, { sx: { display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }, children: sections.map((section) => (_jsxs(Box, { component: "section", "aria-label": section.title, children: [_jsx(Typography, { variant: "subtitle2", component: "h3", sx: { mb: 1 }, children: section.title }), _jsx(Table, { size: "small", children: _jsx(TableBody, { children: section.rows.map((row) => (_jsxs(TableRow, { sx: rowSx, children: [_jsx(TableCell, { sx: { pl: 0, ...labelCellSx }, children: row.label }), _jsx(TableCell, { align: "right", sx: { pr: 0, ...keysCellSx }, children: _jsx(Keys, { keys: row.keys }) })] }, `${row.label}:${row.keys.join()}`))) }) })] }, section.title))) }), differences && differences.length > 0 && (_jsxs(Box, { component: "section", "aria-label": "Differences from Excalidraw", "data-testid": "excalidraw-differences", children: [_jsx(Typography, { variant: "subtitle2", component: "h3", sx: { mb: 1 }, children: "Differences from Excalidraw" }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { sx: { pl: 0 }, children: "Excalidraw" }), _jsx(TableCell, { children: "Here" }), _jsx(TableCell, { sx: { pr: 0 }, children: "Why" })] }) }), _jsx(TableBody, { children: differences.map((d) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { sx: { pl: 0 }, children: [keyNames(d.excalidraw), " (", d.action, ")"] }), _jsx(TableCell, { children: keyNames(d.here) }), _jsx(TableCell, { sx: { pr: 0 }, children: d.why })] }, d.excalidraw + d.action))) })] })] }))] }) }));
