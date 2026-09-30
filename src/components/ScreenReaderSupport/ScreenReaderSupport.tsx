import { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import {
  connectedNames,
  describeSelection,
  keyboardStops,
  plainText
} from 'src/utils';

// lw-068: what a screen reader gets from the diagram. The canvas itself is
// an application region, so a screen reader reads what is said about it,
// not its drawing. Two things are said here:
//
//   * a polite live region, which reads out the selection as it changes
//     (Tab, a click, a search hit) and the result of a keyboard command;
//   * an outline of the diagram outside the canvas: every node with its
//     description and what it is connected to, and every text box, so the
//     whole diagram can be read in a screen reader's browse mode, read-only
//     embeds included. It is the diagram's text alternative.
//
// Both are visually hidden: laid out off screen, but not display: none,
// which would hide them from screen readers too.
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0
} as const;

export const ScreenReaderSupport = () => {
  const announcement = useUiStateStore((state) => {
    return state.announcement;
  });
  const selection = useUiStateStore((state) => {
    return state.selection;
  });
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const title =
    useModelStore((state) => {
      return state.title;
    }) || 'Untitled diagram';
  const modelItems = useModelStore((state) => {
    return state.items;
  });
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const { visibleView, currentView } = useScene();

  const ctx = useMemo(() => {
    return { view: visibleView, modelItems, icons };
  }, [visibleView, modelItems, icons]);

  // Read the selection out when it changes, not when the scene around it
  // does: a nudge re-renders every object and should not repeat the name.
  const ctxRef = useRef(ctx);
  const fullViewRef = useRef(currentView);
  useEffect(() => {
    ctxRef.current = ctx;
    fullViewRef.current = currentView;
  }, [ctx, currentView]);
  const previous = useRef(selection);
  useEffect(() => {
    if (previous.current === selection) return;
    const wasEmpty = previous.current.length === 0;
    previous.current = selection;
    if (selection.length === 0 && wasEmpty) return;
    const stops = keyboardStops(ctxRef.current.view, fullViewRef.current);
    uiStateActions.announce(
      describeSelection(ctxRef.current, stops, selection)
    );
  }, [selection, uiStateActions]);

  const nameOf = (id: string) => {
    return (
      modelItems.find((m) => {
        return m.id === id;
      })?.name ?? 'Untitled'
    );
  };

  const nodes = visibleView.items;
  const textBoxes = visibleView.textBoxes ?? [];
  const connectorCount = (visibleView.connectors ?? []).length;

  if (editorMode === 'NON_INTERACTIVE' && nodes.length === 0) return null;

  return (
    <>
      <Box role="status" aria-live="polite" aria-atomic sx={visuallyHidden}>
        {/* A repeat of the same words is still read: the seq flips a
            trailing no-break space, so the text always changes. */}
        {announcement.text}
        {announcement.seq % 2 === 1 ? ' ' : ''}
      </Box>
      <Box
        component="section"
        aria-label="Diagram outline"
        sx={visuallyHidden}
        data-testid="diagram-outline"
      >
        <h2>Outline of {title}</h2>
        <p>
          {nodes.length} {nodes.length === 1 ? 'item' : 'items'},{' '}
          {connectorCount} {connectorCount === 1 ? 'connector' : 'connectors'}
          {textBoxes.length > 0
            ? `, ${textBoxes.length} ${textBoxes.length === 1 ? 'text box' : 'text boxes'}`
            : ''}
          .
        </p>
        {nodes.length > 0 && (
          <ul aria-label="Items">
            {nodes.map((node) => {
              const model = modelItems.find((m) => {
                return m.id === node.id;
              });
              const description = plainText(model?.description, 500);
              const linked = connectedNames(ctx, node.id);
              return (
                <li key={node.id}>
                  {nameOf(node.id)}
                  {description ? `. ${description}` : ''}
                  {linked.length > 0
                    ? `. Connected to ${linked.join(', ')}.`
                    : '. Not connected.'}
                </li>
              );
            })}
          </ul>
        )}
        {textBoxes.length > 0 && (
          <ul aria-label="Text">
            {textBoxes.map((textBox) => {
              return (
                <li key={textBox.id}>{plainText(textBox.content, 500)}</li>
              );
            })}
          </ul>
        )}
      </Box>
    </>
  );
};
