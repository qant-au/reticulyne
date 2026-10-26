// The one table between Mermaid flowchart node shapes and Reticulyne's
// drawings, read in both directions: an imported node draws with its
// shape's drawing, and an exported object takes the shape its drawing
// stands for. docs/mermaid.md prints this table; a test keeps the two in
// step.
//
// The shape list is Mermaid's own (11.17 and 12.1 carry the same 53). A
// test reads it out of the installed packages, so a shape Mermaid adds
// fails a test here rather than importing as a guess.

/** A Mermaid flowchart node shape. */
export interface MermaidShape {
  /** Mermaid's short name: the canonical `@{ shape: ... }` value. */
  shape: string;
  /** Every other name Mermaid accepts for it in `@{ shape: ... }`. */
  aliases: readonly string[];
  /** What the shape means, in Mermaid's words. */
  meaning: string;
  /** The classic bracket form, `open` + label + `close`, when it has one. */
  brackets?: readonly [string, string];
  /** The built-in drawing (src/icons/drawings.ts) an imported node uses. */
  drawing: string;
  /**
   * True when `drawing` is not this shape but the nearest one. The node
   * still exports back to this shape, which the import records on the
   * object (MERMAID_SHAPE_PROP).
   */
  approximate?: boolean;
  /** Further drawings that export as this shape. */
  alsoFrom?: readonly string[];
  /**
   * The bracket shape it exports as when only classic syntax is wanted,
   * for a shape with no brackets of its own.
   */
  classic?: string;
}

/**
 * The object prop an import records the node's Mermaid shape in, so an
 * export gives back the same shape even where the drawing is the nearest
 * one rather than its own.
 */
export const MERMAID_SHAPE_PROP = 'mermaid.shape';

/** The shape a node takes when nothing says otherwise. */
export const DEFAULT_SHAPE = 'rect';

export const SHAPES: readonly MermaidShape[] = [
  {
    shape: 'rect',
    aliases: ['proc', 'process', 'rectangle', 'squareRect'],
    meaning: 'Process',
    brackets: ['[', ']'],
    drawing: 'flow-process'
  },
  {
    shape: 'rounded',
    aliases: ['event', 'roundedRect'],
    meaning: 'Event',
    brackets: ['(', ')'],
    drawing: 'flow-event'
  },
  {
    shape: 'stadium',
    aliases: ['terminal', 'pill'],
    meaning: 'Terminal point',
    brackets: ['([', '])'],
    drawing: 'flow-terminal'
  },
  {
    shape: 'fr-rect',
    aliases: ['subprocess', 'subproc', 'framed-rectangle', 'subroutine'],
    meaning: 'Subprocess',
    brackets: ['[[', ']]'],
    drawing: 'flow-subprocess'
  },
  {
    shape: 'cyl',
    aliases: ['db', 'database', 'cylinder'],
    meaning: 'Database',
    brackets: ['[(', ')]'],
    drawing: 'flow-database',
    alsoFrom: [
      'database-service',
      'encrypted-database',
      'data-warehouse',
      'data-lake'
    ]
  },
  {
    shape: 'datastore',
    aliases: ['data-store'],
    meaning: 'Data store',
    drawing: 'flow-data-store',
    classic: 'cyl'
  },
  {
    shape: 'folder',
    aliases: ['directory'],
    meaning: 'Folder',
    drawing: 'file-share',
    classic: 'rect'
  },
  {
    shape: 'bucket',
    aliases: [],
    meaning: 'Bucket',
    drawing: 'object-storage',
    classic: 'cyl'
  },
  {
    shape: 'console',
    aliases: [],
    meaning: 'Console (terminal window)',
    drawing: 'flow-console',
    classic: 'rect'
  },
  {
    shape: 'browser',
    aliases: [],
    meaning: 'Browser',
    drawing: 'website',
    classic: 'rect'
  },
  {
    shape: 'person',
    aliases: [],
    meaning: 'Person',
    drawing: 'user',
    alsoFrom: ['user-group', 'administrator', 'guest'],
    classic: 'rounded'
  },
  {
    shape: 'circle',
    aliases: ['circ'],
    meaning: 'Start',
    brackets: ['((', '))'],
    drawing: 'flow-start'
  },
  {
    shape: 'bang',
    aliases: [],
    meaning: 'Bang',
    drawing: 'alert',
    classic: 'hex'
  },
  {
    shape: 'cloud',
    aliases: [],
    meaning: 'Cloud',
    drawing: 'cloud-service',
    alsoFrom: ['internet', 'private-cloud', 'secure-cloud'],
    classic: 'rounded'
  },
  {
    shape: 'diam',
    aliases: ['decision', 'diamond', 'question'],
    meaning: 'Decision',
    brackets: ['{', '}'],
    drawing: 'flow-decision'
  },
  {
    shape: 'hex',
    aliases: ['hexagon', 'prepare'],
    meaning: 'Prepare conditional',
    brackets: ['{{', '}}'],
    drawing: 'flow-prepare'
  },
  {
    shape: 'lean-r',
    aliases: ['lean-right', 'in-out', 'lean_right'],
    meaning: 'Data input/output',
    brackets: ['[/', '/]'],
    drawing: 'flow-data-io'
  },
  {
    shape: 'lean-l',
    aliases: ['lean-left', 'out-in', 'lean_left'],
    meaning: 'Data output/input',
    brackets: ['[\\', '\\]'],
    drawing: 'flow-data-io',
    approximate: true
  },
  {
    shape: 'trap-b',
    aliases: ['priority', 'trapezoid-bottom', 'trapezoid'],
    meaning: 'Priority action',
    brackets: ['[/', '\\]'],
    drawing: 'flow-priority'
  },
  {
    shape: 'trap-t',
    aliases: ['manual', 'trapezoid-top', 'inv-trapezoid', 'inv_trapezoid'],
    meaning: 'Manual operation',
    brackets: ['[\\', '/]'],
    drawing: 'flow-manual-operation'
  },
  {
    shape: 'dbl-circ',
    aliases: ['double-circle', 'doublecircle'],
    meaning: 'Stop',
    brackets: ['(((', ')))'],
    drawing: 'flow-stop'
  },
  {
    shape: 'text',
    aliases: [],
    meaning: 'Text block',
    drawing: 'flow-text',
    classic: 'rect'
  },
  {
    shape: 'notch-rect',
    aliases: ['card', 'notched-rectangle'],
    meaning: 'Card',
    drawing: 'flow-card',
    classic: 'rect'
  },
  {
    shape: 'lin-rect',
    aliases: ['lined-rectangle', 'lined-process', 'lin-proc', 'shaded-process'],
    meaning: 'Lined/shaded process',
    drawing: 'flow-lined-process',
    classic: 'rect'
  },
  {
    shape: 'sm-circ',
    aliases: ['start', 'small-circle', 'stateStart'],
    meaning: 'Start',
    drawing: 'flow-start',
    approximate: true,
    classic: 'circle'
  },
  {
    shape: 'fr-circ',
    aliases: ['stop', 'framed-circle', 'stateEnd'],
    meaning: 'Stop',
    drawing: 'flow-stop',
    approximate: true,
    classic: 'dbl-circ'
  },
  {
    shape: 'fork',
    aliases: ['join', 'forkJoin'],
    meaning: 'Fork/join',
    drawing: 'flow-fork',
    classic: 'rect'
  },
  {
    shape: 'hourglass',
    aliases: ['collate'],
    meaning: 'Collate',
    drawing: 'flow-collate',
    classic: 'rect'
  },
  {
    shape: 'brace',
    aliases: ['comment', 'brace-l'],
    meaning: 'Comment',
    drawing: 'flow-comment',
    classic: 'rect'
  },
  {
    shape: 'brace-r',
    aliases: [],
    meaning: 'Comment right',
    drawing: 'flow-comment',
    approximate: true,
    classic: 'rect'
  },
  {
    shape: 'braces',
    aliases: [],
    meaning: 'Comment with braces on both sides',
    drawing: 'flow-comment',
    approximate: true,
    classic: 'rect'
  },
  {
    shape: 'bolt',
    aliases: ['com-link', 'lightning-bolt'],
    meaning: 'Com link',
    drawing: 'flow-com-link',
    classic: 'rect'
  },
  {
    shape: 'doc',
    aliases: ['document'],
    meaning: 'Document',
    drawing: 'flow-document',
    classic: 'rect'
  },
  {
    shape: 'delay',
    aliases: ['half-rounded-rectangle'],
    meaning: 'Delay',
    drawing: 'flow-delay',
    classic: 'rounded'
  },
  {
    shape: 'h-cyl',
    aliases: ['das', 'horizontal-cylinder'],
    meaning: 'Direct access storage',
    drawing: 'flow-direct-storage',
    classic: 'cyl'
  },
  {
    shape: 'lin-cyl',
    aliases: ['disk', 'lined-cylinder'],
    meaning: 'Disk storage',
    drawing: 'flow-disk-storage',
    classic: 'cyl'
  },
  {
    shape: 'curv-trap',
    aliases: ['curved-trapezoid', 'display'],
    meaning: 'Display',
    drawing: 'flow-display',
    classic: 'rect'
  },
  {
    shape: 'div-rect',
    aliases: ['div-proc', 'divided-rectangle', 'divided-process'],
    meaning: 'Divided process',
    drawing: 'flow-divided-process',
    classic: 'rect'
  },
  {
    shape: 'tri',
    aliases: ['extract', 'triangle'],
    meaning: 'Extract',
    drawing: 'flow-extract',
    classic: 'rect'
  },
  {
    shape: 'win-pane',
    aliases: ['internal-storage', 'window-pane'],
    meaning: 'Internal storage',
    drawing: 'flow-internal-storage',
    classic: 'rect'
  },
  {
    shape: 'f-circ',
    aliases: ['junction', 'filled-circle'],
    meaning: 'Junction',
    drawing: 'flow-junction',
    classic: 'circle'
  },
  {
    shape: 'notch-pent',
    aliases: ['loop-limit', 'notched-pentagon'],
    meaning: 'Loop limit',
    drawing: 'flow-loop-limit',
    classic: 'rect'
  },
  {
    shape: 'flip-tri',
    aliases: ['manual-file', 'flipped-triangle'],
    meaning: 'Manual file',
    drawing: 'flow-manual-file',
    classic: 'rect'
  },
  {
    shape: 'sl-rect',
    aliases: ['manual-input', 'sloped-rectangle'],
    meaning: 'Manual input',
    drawing: 'flow-manual-input',
    classic: 'rect'
  },
  {
    shape: 'docs',
    aliases: ['documents', 'st-doc', 'stacked-document'],
    meaning: 'Multi-document',
    drawing: 'flow-documents',
    classic: 'rect'
  },
  {
    shape: 'st-rect',
    aliases: ['procs', 'processes', 'stacked-rectangle'],
    meaning: 'Multi-process',
    drawing: 'flow-processes',
    classic: 'rect'
  },
  {
    shape: 'bow-rect',
    aliases: ['stored-data', 'bow-tie-rectangle'],
    meaning: 'Stored data',
    drawing: 'flow-stored-data',
    classic: 'rect'
  },
  {
    shape: 'cross-circ',
    aliases: ['summary', 'crossed-circle'],
    meaning: 'Summary',
    drawing: 'flow-summary',
    classic: 'circle'
  },
  {
    shape: 'tag-doc',
    aliases: ['tagged-document'],
    meaning: 'Tagged document',
    drawing: 'flow-document',
    approximate: true,
    classic: 'rect'
  },
  {
    shape: 'tag-rect',
    aliases: ['tagged-rectangle', 'tag-proc', 'tagged-process'],
    meaning: 'Tagged process',
    drawing: 'flow-process',
    approximate: true,
    classic: 'rect'
  },
  {
    shape: 'flag',
    aliases: ['paper-tape'],
    meaning: 'Paper tape',
    drawing: 'flow-paper-tape',
    classic: 'rect'
  },
  {
    shape: 'odd',
    aliases: ['rect_left_inv_arrow'],
    meaning: 'Odd',
    brackets: ['>', ']'],
    drawing: 'flow-odd'
  },
  {
    shape: 'lin-doc',
    aliases: ['lined-document'],
    meaning: 'Lined document',
    drawing: 'flow-document',
    approximate: true,
    classic: 'rect'
  }
];

const BY_NAME = new Map<string, MermaidShape>();
for (const s of SHAPES) {
  BY_NAME.set(s.shape.toLowerCase(), s);
  for (const alias of s.aliases) BY_NAME.set(alias.toLowerCase(), s);
}

/** The shape a `@{ shape: ... }` name means, or undefined. */
export const shapeByName = (name: string): MermaidShape | undefined => {
  return BY_NAME.get(name.trim().toLowerCase());
};

/** Every bracket form, longest opener first, so `(((` wins over `((`. */
export const BRACKET_SHAPES: readonly MermaidShape[] = SHAPES.filter((s) => {
  return s.brackets !== undefined;
}).sort((a, b) => {
  return b.brackets![0].length - a.brackets![0].length;
});

const BY_DRAWING = new Map<string, MermaidShape>();
for (const s of SHAPES) {
  if (!s.approximate && !BY_DRAWING.has(s.drawing)) {
    BY_DRAWING.set(s.drawing, s);
  }
  for (const d of s.alsoFrom ?? []) BY_DRAWING.set(d, s);
}

/** The shape a drawing exports as, or undefined for a device drawing. */
export const shapeForDrawing = (
  drawing: string | undefined
): MermaidShape | undefined => {
  return drawing === undefined ? undefined : BY_DRAWING.get(drawing);
};

/**
 * The shape to write for `shape` in the syntax asked for: itself when it
 * has brackets or extended syntax is allowed, else its classic stand-in.
 */
export const writableShape = (
  shape: MermaidShape,
  syntax: 'classic' | 'extended'
): MermaidShape => {
  if (shape.brackets || syntax === 'extended') return shape;
  return shapeByName(shape.classic ?? DEFAULT_SHAPE)!;
};
