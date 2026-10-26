// What can go wrong reading or writing Mermaid, as codes. An error stops an
// import; a warning says what did not carry across and lets it go ahead.
// docs/mermaid.md lists every code with an example and the fix.

export const MERMAID_ERRORS = {
  MMD_EMPTY: 'There is no diagram here: the text is empty.',
  MMD_NOT_TEXT:
    'This is not text. It looks like a binary file (an image, an archive).',
  MMD_TOO_LARGE: 'The diagram is too large to import.',
  MMD_NO_HEADER:
    'A flowchart starts with "flowchart" or "graph" and a direction, such as "flowchart LR".',
  MMD_UNSUPPORTED_DIAGRAM:
    'Only flowcharts ("flowchart" or "graph") can be imported.',
  MMD_BAD_DIRECTION: 'The direction must be TB, TD, BT, LR or RL.',
  MMD_UNCLOSED_SHAPE: 'A node shape is opened and never closed.',
  MMD_MISMATCHED_BRACKET: 'A node shape is closed with the wrong bracket.',
  MMD_UNCLOSED_STRING: 'A quoted label is never closed.',
  MMD_UNCLOSED_SUBGRAPH: 'A subgraph is never closed with "end".',
  MMD_UNEXPECTED_END: 'There is an "end" with no subgraph open.',
  MMD_BAD_ARROW: 'This is not a Mermaid link.',
  MMD_DANGLING_EDGE: 'A link has nothing at one end.',
  MMD_RESERVED_ID: 'A node cannot be called by a Mermaid keyword.',
  MMD_BAD_ID: 'This cannot be used as a node id.',
  MMD_UNKNOWN_SHAPE: 'Mermaid has no node shape by this name.',
  MMD_BAD_SHAPE_DATA: 'The @{ ... } node data cannot be read.',
  MMD_SUBGRAPH_CYCLE: 'A subgraph cannot contain itself.',
  MMD_TOO_DEEP: 'Subgraphs are nested too deeply.',
  MMD_UNEXPECTED_TOKEN: 'Mermaid cannot read this.',
  MMD_INTERNAL:
    'The diagram read correctly but could not be turned into a Reticulyne diagram.'
} as const;

export const MERMAID_WARNINGS = {
  MMD_CLICK_DROPPED: 'Click actions and links on nodes are not imported.',
  MMD_INIT_IGNORED: 'Mermaid configuration (init, theme) is not imported.',
  MMD_STYLE_PARTIAL:
    'Node and link styles are only partly imported: link colours and dashes carry across, other styling does not.',
  MMD_LABEL_TRUNCATED:
    'A label is longer than 100 characters; the name is cut short and the full text kept as the description.',
  MMD_HTML_STRIPPED: 'HTML in a label is shown as plain text.',
  MMD_SHAPE_APPROXIMATED:
    'A shape has no drawing of its own and uses the nearest one; it exports back as the same shape.',
  MMD_IMAGE_NODE:
    'Icon and image nodes are imported as plain nodes; the image is not fetched.',
  MMD_DUPLICATE_LABEL_ID:
    'A node is defined more than once with different labels; the last one is used.',
  MMD_EXTRA_FENCES:
    'The file holds more than one Mermaid block; only the first is imported.',
  MMD_SELF_LOOP:
    'A link from a node to itself cannot be drawn and is left out.',
  MMD_SUBGRAPH_LINK:
    'A link to a subgraph is drawn to its first node, as Reticulyne links join nodes.',
  MMD_LINK_END_MARKER:
    'Circle and cross link ends are drawn as plain arrowheads.',
  MMD_INVISIBLE_LINK:
    'An invisible link (~~~) only affects the layout and is not drawn.',
  // Export
  MMD_PLAN_VIEW_SKIPPED: 'Plan views are not exported to Mermaid.',
  MMD_HIDDEN_LAYER_SKIPPED: 'Items on hidden layers are left out.',
  MMD_CONNECTION_UNDRAWN:
    'A connection with no connector drawn for it is exported as a dotted link.',
  MMD_FREE_CONNECTOR_END:
    'A connector end that is not on a node is exported as a small junction node.',
  MMD_POSITION_LOST:
    'Mermaid lays the diagram out itself; tile positions are not kept.',
  MMD_ICON_LOST:
    'Device icons have no Mermaid shape and are exported as plain boxes.',
  MMD_TEXT_AS_NOTE: 'A text box not next to a zone is exported as a note node.',
  MMD_TOO_BIG_FOR_MERMAID:
    'The output is over Mermaid’s default limits (50,000 characters or 500 links); some renderers refuse it.'
} as const;

export type MermaidErrorCode = keyof typeof MERMAID_ERRORS;
export type MermaidWarningCode = keyof typeof MERMAID_WARNINGS;
export type MermaidIssueCode = MermaidErrorCode | MermaidWarningCode;

export interface MermaidIssue {
  code: MermaidIssueCode;
  severity: 'error' | 'warning';
  /** One line for a person: what is wrong here, specifically. */
  message: string;
  /** 1-based, in the Mermaid text, when the issue has a place. */
  line?: number;
  column?: number;
  /** The text at that place, cut to a readable length. */
  excerpt?: string;
  /** How many times a warning occurred, when it is folded into one. */
  count?: number;
}

/** At most this many errors are collected before reading stops. */
export const MAX_ERRORS = 20;

export const isError = (issue: MermaidIssue) => {
  return issue.severity === 'error';
};

export const mermaidError = (
  code: MermaidErrorCode,
  detail?: string,
  at?: { line: number; column: number; excerpt?: string }
): MermaidIssue => {
  return {
    code,
    severity: 'error',
    message: detail ?? MERMAID_ERRORS[code],
    ...at
  };
};

export const mermaidWarning = (
  code: MermaidWarningCode,
  detail?: string,
  at?: { line: number; column: number; excerpt?: string }
): MermaidIssue => {
  return {
    code,
    severity: 'warning',
    message: detail ?? MERMAID_WARNINGS[code],
    ...at
  };
};

/**
 * Warnings with the same code folded into one, with a count, so a
 * diagram with 40 device icons says so once. Errors are kept one by one:
 * each is a place to fix.
 */
export const foldWarnings = (issues: MermaidIssue[]): MermaidIssue[] => {
  const out: MermaidIssue[] = [];
  const seen = new Map<string, MermaidIssue>();
  for (const issue of issues) {
    if (issue.severity === 'error') {
      out.push(issue);
      continue;
    }
    const first = seen.get(issue.code);
    if (first) {
      first.count = (first.count ?? 1) + 1;
      continue;
    }
    const copy = { ...issue };
    seen.set(issue.code, copy);
    out.push(copy);
  }
  return out;
};

/** "Line 4, col 9: message", or the message alone when it has no place. */
export const formatIssue = (issue: MermaidIssue): string => {
  const where =
    issue.line === undefined
      ? ''
      : issue.column === undefined
        ? `Line ${issue.line}: `
        : `Line ${issue.line}, col ${issue.column}: `;
  const times = issue.count && issue.count > 1 ? ` (${issue.count} times)` : '';
  return `${where}${issue.message}${times}`;
};
