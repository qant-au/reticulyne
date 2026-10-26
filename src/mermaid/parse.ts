// A reader for Mermaid flowcharts (`flowchart` / `graph`), written for
// Reticulyne rather than borrowed from Mermaid: Mermaid's own parser needs a
// DOM, ships several MB and reports "Parse error on line 3" with a token
// dump. This one reads the same grammar and says, at a line and column, what
// is wrong and what was expected. e2e/mermaid-parity.spec.ts checks it
// agrees with Mermaid on what is and is not a flowchart.
//
// It never throws on input: every failure is an issue. Several errors are
// collected (each statement in error is skipped to the end of its line) so
// a person sees them all at once, up to MAX_ERRORS.

import {
  MAX_ERRORS,
  mermaidError,
  mermaidWarning,
  type MermaidErrorCode,
  type MermaidIssue,
  type MermaidWarningCode
} from './issues';
import { BRACKET_SHAPES, DEFAULT_SHAPE, shapeByName } from './shapes';

export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

export type LinkStroke = 'solid' | 'dotted' | 'thick' | 'invisible';
export type LinkEnd = 'none' | 'arrow' | 'circle' | 'cross';

export interface FlowNode {
  id: string;
  /** The label as a person reads it: entities decoded, HTML stripped. */
  label: string;
  /** Mermaid's short shape name (src/mermaid/shapes.ts). */
  shape: string;
  classes: string[];
  /** Fill, stroke and the like from style / classDef, as written. */
  style: Record<string, string>;
  line: number;
  column: number;
}

export interface FlowEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  stroke: LinkStroke;
  start: LinkEnd;
  end: LinkEnd;
  /** 1 for `-->`; each extra dash adds one (Mermaid's rank span). */
  length: number;
  animated?: boolean;
  /** stroke, stroke-dasharray and the like from linkStyle, as written. */
  style: Record<string, string>;
  line: number;
  column: number;
}

export interface FlowSubgraph {
  id: string;
  title: string;
  /** Node and subgraph ids declared or mentioned inside it, in order. */
  members: string[];
  parent?: string;
  direction?: FlowDirection;
  line: number;
  column: number;
}

export interface Flowchart {
  direction: FlowDirection;
  title?: string;
  description?: string;
  /** In order of first mention. */
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Outermost first. */
  subgraphs: FlowSubgraph[];
}

export interface ParseResult {
  /** Present when there are no errors. */
  flowchart?: Flowchart;
  issues: MermaidIssue[];
}

/** Text longer than this is refused before it is read. */
export const MAX_TEXT_LENGTH = 1_000_000;
export const MAX_NODES = 10_000;
export const MAX_EDGES = 5_000;
export const MAX_DEPTH = 32;

// Mermaid's other diagram types, so a sequence diagram is told it is one
// rather than that it lacks a header.
const OTHER_DIAGRAMS = new Set(
  [
    'sequenceDiagram',
    'classDiagram',
    'classDiagram-v2',
    'stateDiagram',
    'stateDiagram-v2',
    'erDiagram',
    'journey',
    'gantt',
    'pie',
    'quadrantChart',
    'requirementDiagram',
    'gitGraph',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment',
    'mindmap',
    'timeline',
    'zenuml',
    'sankey',
    'sankey-beta',
    'xychart',
    'xychart-beta',
    'block',
    'block-beta',
    'packet',
    'packet-beta',
    'kanban',
    'architecture',
    'architecture-beta',
    'radar-beta',
    'treemap',
    'treemap-beta',
    'venn-beta',
    'info'
  ].map((d) => {
    return d.toLowerCase();
  })
);

const DIRECTIONS: Record<string, FlowDirection> = {
  TB: 'TB',
  TD: 'TB',
  BT: 'BT',
  LR: 'LR',
  RL: 'RL',
  '>': 'LR',
  '<': 'RL',
  '^': 'BT',
  v: 'TB'
};

// Words that start a statement, so cannot be a node's id.
const KEYWORDS = new Set([
  'end',
  'subgraph',
  'graph',
  'flowchart',
  'flowchart-elk',
  'style',
  'linkstyle',
  'classdef',
  'class',
  'click',
  'call',
  'href',
  'direction',
  'acctitle',
  'accdescr'
]);

// Ids no diagram may use, whatever Mermaid allows: they name an object's
// prototype machinery.
const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype']);

const ENTITIES: Record<string, string> = {
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  apos: "'",
  nbsp: ' ',
  hash: '#',
  semi: ';',
  colon: ':'
};

const ID_CHAR = /[\p{L}\p{N}_]/u;

interface Pos {
  line: number;
  column: number;
}

class Stop extends Error {}

class StatementError extends Error {
  constructor(
    public code: MermaidErrorCode,
    public detail: string,
    public at: number
  ) {
    super(detail);
  }
}

/** Where a Markdown file keeps its diagram: the first ```mermaid fence. */
const extractFence = (
  text: string
): { body: string; offset: number; extra: boolean } | 'no-fence' | null => {
  const lines = text.split('\n');
  const open = /^\s*(`{3,}|~{3,})\s*mermaid\b/;
  let start = -1;
  let fence = '';
  for (let i = 0; i < lines.length; i += 1) {
    const m = open.exec(lines[i]);
    if (m) {
      start = i;
      fence = m[1];
      break;
    }
  }
  if (start === -1) {
    // A Markdown file with code fences but none of them Mermaid.
    return /^\s*(`{3,}|~{3,})/m.test(text) ? 'no-fence' : null;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith(fence)) {
      end = i;
      break;
    }
  }
  const rest = lines.slice(end + 1).join('\n');
  return {
    body: lines.slice(start + 1, end).join('\n'),
    offset: start + 1,
    extra: open.test(rest) || /^\s*(`{3,}|~{3,})\s*mermaid\b/m.test(rest)
  };
};

const looksBinary = (text: string) => {
  if (text.includes('\u0000') || text.startsWith('\u0089PNG')) return true;
  const sample = text.slice(0, 2048);
  let control = 0;
  for (const ch of sample) {
    const c = ch.charCodeAt(0);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) control += 1;
    if (c === 0xfffd) control += 1;
  }
  return sample.length > 0 && control / sample.length > 0.05;
};

/** A label as a person reads it, and whether HTML had to go. */
export const plainLabel = (raw: string): { text: string; html: boolean } => {
  let text = raw;
  let html = false;
  // Markdown strings: "`**bold** and *em*`".
  const md = /^`([\s\S]*)`$/.exec(text.trim());
  if (md) {
    text = md[1].replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__/g, (...m) => {
      return m[1] ?? m[2] ?? m[3];
    });
  }
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?[A-Za-z][^<>]*>/g, () => {
    html = true;
    return '';
  });
  text = text.replace(/#(\w+);/g, (whole, name: string) => {
    if (/^\d+$/.test(name)) {
      const code = Number(name);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
  return { text: text.replace(/[ \t]+/g, ' ').trim(), html };
};

const parseStyleList = (text: string): Record<string, string> => {
  const style: Record<string, string> = {};
  for (const part of text.split(/,(?![^(]*\))/)) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim();
    const value = part
      .slice(colon + 1)
      .replace(/;$/, '')
      .trim();
    if (key && value && !FORBIDDEN_IDS.has(key)) style[key] = value;
  }
  return style;
};

class Parser {
  private pos = 0;
  private readonly lineStarts: number[] = [0];
  private readonly issues: MermaidIssue[] = [];
  private errors = 0;

  private direction: FlowDirection = 'TB';
  private title?: string;
  private description?: string;
  private readonly nodes = new Map<string, FlowNode>();
  private readonly edges: FlowEdge[] = [];
  private readonly edgeIds = new Map<string, FlowEdge>();
  private readonly subgraphs = new Map<string, FlowSubgraph>();
  private readonly open: FlowSubgraph[] = [];
  private readonly classDefs = new Map<string, Record<string, string>>();
  private readonly classUses: { ids: string[]; cls: string }[] = [];
  private readonly nodeStyles: { id: string; style: Record<string, string> }[] =
    [];
  private readonly linkStyles: {
    which: number[] | 'default';
    style: Record<string, string>;
  }[] = [];
  private generated = 0;
  private styled = false;
  private warned = new Set<string>();

  constructor(
    private readonly src: string,
    private readonly lineOffset: number
  ) {
    for (let i = 0; i < src.length; i += 1) {
      if (src[i] === '\n') this.lineStarts.push(i + 1);
    }
  }

  // ---------- positions and issues ----------

  private where(at: number): Pos {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return {
      line: lo + 1 + this.lineOffset,
      column: at - this.lineStarts[lo] + 1
    };
  }

  private excerpt(at: number) {
    const lineEnd = this.src.indexOf('\n', at);
    const text = this.src.slice(at, lineEnd === -1 ? undefined : lineEnd);
    return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  }

  private error(code: MermaidErrorCode, detail: string, at: number) {
    this.issues.push(
      mermaidError(code, detail, {
        ...this.where(at),
        excerpt: this.excerpt(at)
      })
    );
    this.errors += 1;
    if (this.errors >= MAX_ERRORS) throw new Stop();
  }

  private warn(code: MermaidWarningCode, at?: number, detail?: string) {
    this.issues.push(
      mermaidWarning(
        code,
        detail,
        at === undefined ? undefined : this.where(at)
      )
    );
  }

  private warnOnce(code: MermaidWarningCode, at?: number) {
    if (this.warned.has(code)) return;
    this.warned.add(code);
    this.warn(code, at);
  }

  private fail(code: MermaidErrorCode, detail: string, at = this.pos): never {
    throw new StatementError(code, detail, at);
  }

  // ---------- scanning ----------

  private peek(n = 0) {
    return this.src[this.pos + n] ?? '';
  }

  private startsWith(s: string, at = this.pos) {
    return this.src.startsWith(s, at);
  }

  private atEnd() {
    return this.pos >= this.src.length;
  }

  /** Spaces and tabs only: a newline ends a statement. */
  private skipBlank() {
    while (
      this.peek() === ' ' ||
      this.peek() === '\t' ||
      this.peek() === '\r'
    ) {
      this.pos += 1;
    }
  }

  private atStatementEnd() {
    this.skipBlank();
    // Mermaid reads %% only at the start of a line; after code it fails.
    if (this.startsWith('%%')) {
      this.fail(
        'MMD_UNEXPECTED_TOKEN',
        'A comment (%%) must be on a line of its own in Mermaid, not after a statement.'
      );
    }
    return this.atEnd() || this.peek() === '\n' || this.peek() === ';';
  }

  private skipToLineEnd() {
    const nl = this.src.indexOf('\n', this.pos);
    this.pos = nl === -1 ? this.src.length : nl;
  }

  private readWord() {
    const start = this.pos;
    while (!this.atEnd() && /[^\s;]/.test(this.peek())) this.pos += 1;
    return this.src.slice(start, this.pos);
  }

  private restOfLine() {
    const start = this.pos;
    this.skipToLineEnd();
    return this.src.slice(start, this.pos).replace(/\r$/, '');
  }

  /**
   * A node id at the cursor. Hyphens and dots belong to the id unless they
   * start a link (`--`, `-.`, `-x`... ): `a-b` is one id, `a-->b` is two.
   */
  private readId(): string {
    const start = this.pos;
    while (!this.atEnd()) {
      const ch = this.peek();
      if (ID_CHAR.test(ch)) {
        this.pos += 1;
        continue;
      }
      if ((ch === '-' || ch === '.') && ID_CHAR.test(this.peek(1))) {
        if (ch === '-' && this.peek(1) && /[xo]/.test(this.peek(1))) {
          // "a-x" could be "a" then a cross link "-x"... Mermaid reads it
          // as one id; so do we.
        }
        this.pos += 1;
        continue;
      }
      break;
    }
    return this.src.slice(start, this.pos);
  }

  // ---------- the document ----------

  run(): ParseResult {
    try {
      this.document();
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
    }
    if (this.errors > 0) return { issues: this.issues };
    const flowchart = this.build();
    // Building finds errors too: a subgraph inside itself, too many links.
    if (
      this.issues.some((i) => {
        return i.severity === 'error';
      })
    ) {
      return { issues: this.issues };
    }
    return { flowchart, issues: this.issues };
  }

  private skipTrivia() {
    for (;;) {
      while (/[\s;]/.test(this.peek()) && !this.atEnd()) this.pos += 1;
      if (this.startsWith('%%{')) {
        const close = this.src.indexOf('}%%', this.pos);
        this.warnOnce('MMD_INIT_IGNORED', this.pos);
        this.pos = close === -1 ? this.src.length : close + 3;
        continue;
      }
      if (this.startsWith('%%')) {
        this.skipToLineEnd();
        continue;
      }
      return;
    }
  }

  private frontMatter() {
    if (
      !/^---[ \t]*\r?$/m.test(
        this.src.slice(0, this.src.indexOf('\n') + 1 || undefined)
      )
    ) {
      return;
    }
    if (!this.startsWith('---')) return;
    const close = /\n---[ \t]*\r?(\n|$)/.exec(this.src.slice(3));
    if (!close) {
      this.error(
        'MMD_UNEXPECTED_TOKEN',
        'The front matter opened with "---" on line 1 is never closed with another "---".',
        0
      );
      this.pos = this.src.length;
      return;
    }
    const body = this.src.slice(3, 3 + close.index);
    const title = /^title:\s*(.*)$/m.exec(body);
    if (title) {
      this.title = plainLabel(title[1].replace(/^["']|["']$/g, '')).text;
    }
    if (/^(config|init|theme):/m.test(body))
      this.warnOnce('MMD_INIT_IGNORED', 0);
    this.pos = 3 + close.index + close[0].length;
  }

  private document() {
    this.frontMatter();
    this.skipTrivia();
    if (this.atEnd()) {
      this.error(
        'MMD_EMPTY',
        'There is no diagram here: the text is empty or holds only comments.',
        Math.max(0, this.src.length - 1)
      );
      return;
    }
    try {
      this.header();
    } catch (e) {
      if (!(e instanceof StatementError)) throw e;
      this.error(e.code, e.detail, e.at);
      throw new Stop();
    }
    for (;;) {
      this.skipTrivia();
      if (this.atEnd()) break;
      const start = this.pos;
      try {
        this.statement();
        if (!this.atStatementEnd()) {
          this.fail(
            'MMD_UNEXPECTED_TOKEN',
            `Unexpected "${this.excerpt(this.pos).split(/\s/)[0]}" here; a statement ends at the end of the line or a ";".`
          );
        }
      } catch (e) {
        if (!(e instanceof StatementError)) throw e;
        this.error(e.code, e.detail, e.at);
        // Skip the rest of the line; an unclosed quote or bracket has
        // already been reported, so no further line is swallowed.
        this.pos = Math.max(this.pos, start);
        this.skipToLineEnd();
      }
    }
    for (const sg of this.open) {
      const at = this.lineStarts[sg.line - 1 - this.lineOffset] ?? 0;
      this.error(
        'MMD_UNCLOSED_SUBGRAPH',
        `The subgraph "${sg.title}" opened on line ${sg.line} is never closed with "end".`,
        at + sg.column - 1
      );
    }
  }

  private header() {
    const start = this.pos;
    const word = this.readWord();
    const lower = word.toLowerCase();
    if (
      lower === 'flowchart' ||
      lower === 'graph' ||
      lower === 'flowchart-elk'
    ) {
      this.skipBlank();
      if (this.atStatementEnd()) return;
      const dirAt = this.pos;
      const dir = this.readWord();
      const d = DIRECTIONS[dir] ?? DIRECTIONS[dir.toUpperCase()];
      if (!d) {
        this.error(
          'MMD_BAD_DIRECTION',
          `"${dir}" is not a direction; use TB, TD, BT, LR or RL.`,
          dirAt
        );
        this.skipToLineEnd();
        return;
      }
      this.direction = d;
      return;
    }
    if (OTHER_DIAGRAMS.has(lower)) {
      this.error(
        'MMD_UNSUPPORTED_DIAGRAM',
        `"${word}" diagrams can't be imported; only flowcharts ("flowchart" or "graph") can.`,
        start
      );
      throw new Stop();
    }
    this.error(
      'MMD_NO_HEADER',
      `A flowchart starts with "flowchart" or "graph" and a direction, such as "flowchart LR"; this starts with "${word.slice(0, 30)}".`,
      start
    );
    throw new Stop();
  }

  // ---------- statements ----------

  private statement() {
    const start = this.pos;
    const word =
      /^[A-Za-z][\w-]*/.exec(this.src.slice(this.pos, this.pos + 40))?.[0] ??
      '';
    const after = this.src[this.pos + word.length] ?? '';
    const isKeyword = (k: string) => {
      return (
        word.toLowerCase() === k && (after === '' || /[\s;:{]/.test(after))
      );
    };

    if (isKeyword('subgraph')) return this.subgraph();
    if (word === 'end' && (after === '' || /[\s;]/.test(after))) {
      this.pos += 3;
      const sg = this.open.pop();
      if (!sg) {
        this.fail(
          'MMD_UNEXPECTED_END',
          'There is an "end" here with no subgraph open.',
          start
        );
      }
      return;
    }
    if (isKeyword('direction')) {
      this.pos += word.length;
      this.skipBlank();
      const dirAt = this.pos;
      const dir = this.readWord();
      const d = DIRECTIONS[dir] ?? DIRECTIONS[dir.toUpperCase()];
      if (!d) {
        this.fail(
          'MMD_BAD_DIRECTION',
          `"${dir}" is not a direction; use TB, TD, BT, LR or RL.`,
          dirAt
        );
      }
      const sg = this.open[this.open.length - 1];
      if (sg) sg.direction = d;
      else this.direction = d;
      return;
    }
    if (isKeyword('classdef')) {
      this.pos += word.length;
      this.skipBlank();
      const names = this.readWord();
      this.skipBlank();
      const style = parseStyleList(this.restOfLine());
      for (const n of names.split(',')) {
        if (n && !FORBIDDEN_IDS.has(n)) this.classDefs.set(n, style);
      }
      this.styled = true;
      return;
    }
    if (isKeyword('class')) {
      this.pos += word.length;
      this.skipBlank();
      const ids = this.readWord().split(',').filter(Boolean);
      this.skipBlank();
      const cls = this.readWord();
      if (!ids.length || !cls) {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A "class" line names the nodes and then the class: class A,B myClass.',
          start
        );
      }
      this.classUses.push({ ids, cls });
      return;
    }
    if (isKeyword('style')) {
      this.pos += word.length;
      this.skipBlank();
      const id = this.readWord();
      this.skipBlank();
      this.nodeStyles.push({ id, style: parseStyleList(this.restOfLine()) });
      this.styled = true;
      return;
    }
    if (isKeyword('linkstyle')) {
      this.pos += word.length;
      this.skipBlank();
      const whichAt = this.pos;
      const which = this.readWord();
      this.skipBlank();
      const style = parseStyleList(this.restOfLine());
      if (which === 'default') {
        this.linkStyles.push({ which: 'default', style });
        return;
      }
      const indices = which.split(',').map(Number);
      if (
        !which ||
        indices.some((n) => {
          return !Number.isInteger(n) || n < 0;
        })
      ) {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          `linkStyle takes link numbers (0, 1, ...) or "default", not "${which}".`,
          whichAt
        );
      }
      this.linkStyles.push({ which: indices, style });
      return;
    }
    if (isKeyword('click') || isKeyword('call') || isKeyword('href')) {
      this.warn('MMD_CLICK_DROPPED', start);
      this.restOfLine();
      return;
    }
    if (isKeyword('acctitle')) {
      this.pos += word.length;
      this.skipBlank();
      if (this.peek() === ':') this.pos += 1;
      this.skipBlank();
      this.title ??= plainLabel(this.restOfLine()).text;
      return;
    }
    if (isKeyword('accdescr')) {
      this.pos += word.length;
      this.skipBlank();
      if (this.peek() === '{') {
        const close = this.src.indexOf('}', this.pos);
        if (close === -1)
          this.fail(
            'MMD_UNEXPECTED_TOKEN',
            'accDescr { is never closed with }.',
            start
          );
        this.description = plainLabel(
          this.src.slice(this.pos + 1, close).replace(/\s+/g, ' ')
        ).text;
        this.pos = close + 1;
        return;
      }
      if (this.peek() === ':') this.pos += 1;
      this.skipBlank();
      this.description = plainLabel(this.restOfLine()).text;
      return;
    }
    this.chain();
  }

  private subgraph() {
    const start = this.pos;
    this.pos += 'subgraph'.length;
    this.skipBlank();
    if (this.open.length >= MAX_DEPTH) {
      this.fail(
        'MMD_TOO_DEEP',
        `Subgraphs are nested more than ${MAX_DEPTH} deep.`,
        start
      );
    }
    let id: string;
    let title: string;
    if (this.atStatementEnd()) {
      this.generated += 1;
      id = `subGraph${this.generated}`;
      title = '';
    } else if (this.peek() === '"') {
      title = this.quoted();
      this.generated += 1;
      id = `subGraph${this.generated}`;
    } else {
      const idAt = this.pos;
      id = this.readId();
      if (!id)
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A subgraph needs a name: subgraph name, or subgraph id [Title].',
          idAt
        );
      this.checkId(id, idAt);
      this.skipBlank();
      if (this.peek() === '[') {
        this.pos += 1;
        const label = this.labelUntil([']'], idAt, '[');
        title = label.text;
      } else if (!this.atStatementEnd()) {
        // "subgraph Some title": the whole line is the title.
        title = `${id} ${this.restOfLine()}`.trim();
        this.generated += 1;
        id = `subGraph${this.generated}`;
      } else {
        title = id;
      }
    }
    const parent = this.open[this.open.length - 1];
    const existing = this.subgraphs.get(id);
    const sg: FlowSubgraph = existing ?? {
      id,
      title,
      members: [],
      ...this.where(start)
    };
    if (parent) {
      sg.parent ??= parent.id;
      if (!parent.members.includes(id)) parent.members.push(id);
    }
    this.subgraphs.set(id, sg);
    this.open.push(sg);
  }

  /** `A --> B & C -- label --- D`: vertices joined by links. */
  private chain() {
    let left = this.vertexGroup();
    for (;;) {
      this.skipBlank();
      if (this.atStatementEnd()) return;
      const linkAt = this.pos;
      if (!/[-=.<>~|\p{L}\p{N}_]/u.test(this.peek())) {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          `Unexpected "${this.peek()}" after the node "${left[left.length - 1]}"; expected a link such as "-->" or the end of the line.`
        );
      }
      const link = this.link();
      this.skipBlank();
      if (this.atStatementEnd()) {
        this.fail(
          'MMD_DANGLING_EDGE',
          'This link has nothing at its far end: add the node it goes to.',
          linkAt
        );
      }
      const right = this.vertexGroup();
      for (const from of left) {
        for (const to of right) {
          const edge: FlowEdge = {
            from,
            to,
            stroke: link.stroke,
            start: link.start,
            end: link.end,
            length: link.length,
            style: {},
            ...this.where(linkAt)
          };
          if (link.label) edge.label = link.label;
          if (link.id && left.length === 1 && right.length === 1) {
            edge.id = link.id;
            this.edgeIds.set(link.id, edge);
          }
          this.edges.push(edge);
        }
      }
      left = right;
    }
  }

  private vertexGroup(): string[] {
    const ids = [this.vertex()];
    for (;;) {
      this.skipBlank();
      if (this.peek() !== '&') return ids;
      this.pos += 1;
      this.skipBlank();
      ids.push(this.vertex());
    }
  }

  private checkId(id: string, at: number) {
    if (KEYWORDS.has(id) && id === id.toLowerCase()) {
      this.fail(
        'MMD_RESERVED_ID',
        `"${id}" is a Mermaid keyword and cannot name a node; call it something else, such as "${id}1" or "${id[0].toUpperCase()}${id.slice(1)}".`,
        at
      );
    }
    if (FORBIDDEN_IDS.has(id)) {
      this.fail('MMD_BAD_ID', `"${id}" cannot be used as a node id.`, at);
    }
  }

  /** One node: its id, then an optional shape, @{ data } and :::class. */
  private vertex(): string {
    const at = this.pos;
    const id = this.readId();
    if (!id) {
      const ch = this.peek();
      if (/[-=.<>~]/.test(ch)) {
        this.fail(
          'MMD_DANGLING_EDGE',
          'This link has nothing at its near end: put a node before it.',
          at
        );
      }
      if (ch === '"') {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A node needs an id before its label: A["label"].',
          at
        );
      }
      this.fail(
        'MMD_UNEXPECTED_TOKEN',
        `Expected a node id here, found "${ch === '\n' ? 'the end of the line' : ch}".`,
        at
      );
    }
    this.checkId(id, at);
    if (this.subgraphs.has(id) && !this.nodes.has(id)) {
      // A subgraph's id used as a vertex: a link to the subgraph.
      this.member(id);
      this.afterVertex(id, at, false);
      return id;
    }
    const node = this.node(id, at);
    if (this.peek() === '@' && this.peek(1) === '{') {
      this.pos += 1;
      this.shapeData(node.id, at);
    } else {
      const shaped = this.shape(node.id, at);
      if (shaped && this.peek() === '@' && this.peek(1) === '{') {
        this.pos += 1;
        this.shapeData(node.id, at);
      }
    }
    this.afterVertex(id, at, true);
    return id;
  }

  private afterVertex(id: string, at: number, isNode: boolean) {
    if (this.startsWith(':::')) {
      this.pos += 3;
      const cls = this.readId();
      if (!cls)
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A class name is expected after ":::".',
          this.pos
        );
      if (isNode) this.classUses.push({ ids: [id], cls });
    }
    void at;
  }

  private node(id: string, at: number): FlowNode {
    let node = this.nodes.get(id);
    if (!node) {
      node = {
        id,
        label: id,
        shape: DEFAULT_SHAPE,
        classes: [],
        style: {},
        ...this.where(at)
      };
      this.nodes.set(id, node);
      if (this.nodes.size > MAX_NODES) {
        this.fail(
          'MMD_TOO_LARGE',
          `The diagram has more than ${MAX_NODES} nodes.`,
          at
        );
      }
    }
    this.member(id);
    return node;
  }

  private member(id: string) {
    const sg = this.open[this.open.length - 1];
    if (!sg) return;
    // A node belongs to the subgraph it is first mentioned in, as in
    // Mermaid; a later mention elsewhere moves it.
    for (const other of this.subgraphs.values()) {
      if (other !== sg) {
        const i = other.members.indexOf(id);
        if (i !== -1 && this.subgraphs.has(id) === false)
          other.members.splice(i, 1);
      }
    }
    if (!sg.members.includes(id)) sg.members.push(id);
  }

  private setLabel(id: string, raw: string, at: number, quoted: boolean) {
    const node = this.nodes.get(id)!;
    const { text, html } =
      quoted && raw.startsWith('`') ? plainLabel(raw) : plainLabel(raw);
    if (html) this.warnOnce('MMD_HTML_STRIPPED', at);
    if (node.label !== node.id && node.label !== text && text) {
      this.warn(
        'MMD_DUPLICATE_LABEL_ID',
        at,
        `The node "${node.id}" is defined again with a different label; the label "${text}" is used.`
      );
    }
    node.label = text;
  }

  /** A bracket shape after a node id, if there is one. */
  private shape(id: string, idAt: number): boolean {
    const node = this.nodes.get(id)!;
    const at = this.pos;
    const candidates = BRACKET_SHAPES.filter((s) => {
      return this.startsWith(s.brackets![0]);
    });
    if (!candidates.length) {
      // An unquoted bracket the user meant as a shape opener but mistyped.
      return false;
    }
    // The longest opener decides, as in Mermaid's lexer: `((x)` is an
    // unclosed circle, never a rounded box labelled "(x".
    const opener = candidates[0].brackets![0];
    const shapes = candidates.filter((s) => {
      return s.brackets![0] === opener;
    });
    this.pos = at + opener.length;
    const label = this.labelUntil(
      shapes.map((s) => {
        return s.brackets![1];
      }),
      at,
      opener
    );
    const shape = shapes.find((s) => {
      return s.brackets![1] === label.closer;
    })!;
    node.shape = shape.shape;
    this.setLabel(node.id, label.raw, at, label.quoted);
    void idAt;
    return true;
  }

  /** A double-quoted string at the cursor; markdown strings may span lines. */
  private quoted(): string {
    const at = this.pos;
    this.pos += 1;
    const markdown = this.peek() === '`';
    const close = this.src.indexOf('"', this.pos);
    const nl = this.src.indexOf('\n', this.pos);
    if (close === -1 || (!markdown && nl !== -1 && nl < close)) {
      this.fail(
        'MMD_UNCLOSED_STRING',
        'This quoted label is never closed with a ".',
        at
      );
    }
    const raw = this.src.slice(this.pos, close);
    this.pos = close + 1;
    return markdown ? raw : raw;
  }

  /**
   * A shape's label up to one of `closers`: a quoted string, or raw text
   * on the same line. Errors name the bracket that was opened and where.
   */
  private labelUntil(
    closers: string[],
    openAt: number,
    opener: string
  ): { raw: string; text: string; closer: string; quoted: boolean } {
    this.skipBlank();
    const longestFirst = [...closers].sort((a, b) => {
      return b.length - a.length;
    });
    const matchCloser = () => {
      return longestFirst.find((c) => {
        return this.startsWith(c);
      });
    };
    const where = this.where(openAt);
    const expected = longestFirst
      .map((c) => {
        return `"${c}"`;
      })
      .join(' or ');
    if (this.peek() === '"') {
      const raw = this.quoted();
      this.skipBlank();
      const closer = matchCloser();
      if (!closer) {
        this.fail(
          this.atStatementEnd()
            ? 'MMD_UNCLOSED_SHAPE'
            : 'MMD_MISMATCHED_BRACKET',
          `Expected ${expected} to close the "${opener}" opened at line ${where.line}, col ${where.column}.`,
          this.pos
        );
      }
      this.pos += closer.length;
      return { raw, text: plainLabel(raw).text, closer, quoted: true };
    }
    const start = this.pos;
    const others = ['[', ']', '(', ')', '{', '}'];
    while (!this.atEnd() && this.peek() !== '\n') {
      const closer = matchCloser();
      if (closer) {
        const raw = this.src.slice(start, this.pos).replace(/\r$/, '');
        this.pos += closer.length;
        return { raw, text: plainLabel(raw).text, closer, quoted: false };
      }
      if (this.peek() === '"') {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A quote inside an unquoted label: put the whole label in quotes, A["say \\"hi\\""] is written A["say #quot;hi#quot;"].',
          this.pos
        );
      }
      const ch = this.peek();
      if (others.includes(ch) && !opener.includes(ch)) {
        const closing = ch === ']' || ch === ')' || ch === '}';
        if (closing) {
          this.fail(
            'MMD_MISMATCHED_BRACKET',
            `"${ch}" cannot close the "${opener}" opened at line ${where.line}, col ${where.column}; expected ${expected}.`,
            this.pos
          );
        }
        // An opening bracket inside raw text is a shape Mermaid cannot read.
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          `"${ch}" cannot appear in an unquoted label; put the label in quotes: A["..."].`,
          this.pos
        );
      }
      this.pos += 1;
    }
    this.fail(
      'MMD_UNCLOSED_SHAPE',
      `Expected ${expected} to close the "${opener}" opened at line ${where.line}, col ${where.column}.`,
      openAt
    );
  }

  /** `@{ shape: diam, label: "Ok?" }`: Mermaid's node data. */
  private shapeData(id: string, at: number) {
    const node = this.nodes.get(id)!;
    const open = this.pos;
    const close = this.findDataClose(open);
    if (close === -1) {
      this.fail(
        'MMD_BAD_SHAPE_DATA',
        'The "@{" node data is never closed with "}".',
        open
      );
    }
    const body = this.src.slice(open + 1, close);
    this.pos = close + 1;
    const data = new Map<string, string>();
    for (const part of body.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)|\n/)) {
      const piece = part.trim();
      if (!piece) continue;
      const colon = piece.indexOf(':');
      if (colon <= 0) {
        this.fail(
          'MMD_BAD_SHAPE_DATA',
          `"${piece.slice(0, 30)}" is not "key: value" inside @{ }.`,
          open
        );
      }
      const key = piece.slice(0, colon).trim().toLowerCase();
      const value = piece
        .slice(colon + 1)
        .trim()
        .replace(/^"([\s\S]*)"$/, '$1')
        .replace(/^'([\s\S]*)'$/, '$1');
      data.set(key, value);
    }
    const shapeName = data.get('shape');
    if (shapeName !== undefined) {
      const shape = shapeByName(shapeName);
      if (!shape) {
        this.fail(
          'MMD_UNKNOWN_SHAPE',
          `Mermaid has no node shape called "${shapeName}".`,
          open
        );
      }
      node.shape = shape.shape;
    }
    if (data.has('icon') || data.has('img')) {
      this.warnOnce('MMD_IMAGE_NODE', at);
    }
    const label = data.get('label');
    if (label !== undefined) this.setLabel(node.id, label, at, true);
  }

  /** The `}` closing `@{`, skipping quoted strings. */
  private findDataClose(open: number) {
    let i = open + 1;
    while (i < this.src.length) {
      const ch = this.src[i];
      if (ch === '"') {
        const end = this.src.indexOf('"', i + 1);
        if (end === -1) return -1;
        i = end + 1;
        continue;
      }
      if (ch === '}') return i;
      i += 1;
    }
    return -1;
  }

  // ---------- links ----------

  /**
   * One link: `-->`, `---`, `-.->`, `==>`, `~~~`, their longer forms, the
   * `o` / `x` / `<` ends, an `id@` in front, and a label either inline
   * (`-- text -->`) or after it (`-->|text|`).
   */
  private link(): {
    stroke: LinkStroke;
    start: LinkEnd;
    end: LinkEnd;
    length: number;
    label?: string;
    id?: string;
  } {
    const at = this.pos;
    let id: string | undefined;
    const idMatch = /^([\p{L}\p{N}_][\p{L}\p{N}_-]*)@(?=[-=.~<ox])/u.exec(
      this.src.slice(this.pos, this.pos + 80)
    );
    if (idMatch) {
      id = idMatch[1];
      this.pos += idMatch[0].length;
    }
    const rest = this.src.slice(this.pos, this.pos + 400);
    const startEnd = (c: string | undefined): LinkEnd => {
      if (c === '<') return 'arrow';
      if (c === 'o') return 'circle';
      if (c === 'x') return 'cross';
      return 'none';
    };
    const finish = (c: string | undefined): LinkEnd => {
      if (c === '>') return 'arrow';
      if (c === 'o') return 'circle';
      if (c === 'x') return 'cross';
      return 'none';
    };

    // Complete links.
    const forms: [RegExp, LinkStroke][] = [
      [/^([<ox])?(-{2,})([->ox])/, 'solid'],
      [/^([<ox])?(={2,})([=>ox])/, 'thick'],
      [/^([<ox])?-(\.+)-([>ox])?/, 'dotted'],
      [/^(~{3,})/, 'invisible']
    ];
    // An inline label opener: `--`, `==` or `-.` followed by text.
    const labelled = /^([<ox])?(--|==|-\.)(?=[ \t]*[^\s\->=.ox~])/.exec(rest);
    if (
      labelled &&
      !/^([<ox])?(-{2,})([->ox])/.test(rest.slice(0, 4).replace(/ /g, '#'))
    ) {
      return { ...this.inlineLabel(labelled, at), id };
    }
    for (const [re, stroke] of forms) {
      const m = re.exec(rest);
      if (!m) continue;
      this.pos += m[0].length;
      let result: ReturnType<Parser['link']>;
      if (stroke === 'invisible') {
        result = {
          stroke,
          start: 'none',
          end: 'none',
          length: m[1].length - 2
        };
      } else if (stroke === 'dotted') {
        result = {
          stroke,
          start: startEnd(m[1]),
          end: finish(m[3]),
          length: m[2].length
        };
      } else {
        // `-->` and `---` are both one rank; each extra dash adds one.
        result = {
          stroke,
          start: startEnd(m[1]),
          end: finish(m[3]),
          length: Math.max(1, m[2].length - 1)
        };
      }
      if (result.start !== 'none' && result.end === 'none') {
        // "<--" alone: Mermaid has no reversed link without a head.
        this.fail(
          'MMD_BAD_ARROW',
          `"${m[0]}" is not a Mermaid link; a link starting with "${m[1]}" must end with one too, such as "<-->".`,
          at
        );
      }
      const label = this.pipeLabel();
      if (label !== undefined) result.label = label;
      if (id) result.id = id;
      return result;
    }
    const bad = /^[-=.<>~ox|]+/.exec(rest)?.[0] ?? rest.slice(0, 1);
    const hint =
      bad === '->' || bad === '=>'
        ? ` Did you mean "${bad[0]}${bad}"?`
        : ' A link is written -->, ---, -.->, ==> or ~~~.';
    this.fail('MMD_BAD_ARROW', `"${bad}" is not a Mermaid link.${hint}`, at);
  }

  private pipeLabel(): string | undefined {
    this.skipBlank();
    if (this.peek() !== '|') return undefined;
    const at = this.pos;
    this.pos += 1;
    let raw: string;
    if (this.peek() === '"') {
      raw = this.quoted();
      if (this.peek() !== '|') {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A link label opened with "|" is never closed with "|".',
          at
        );
      }
    } else {
      const close = this.src.indexOf('|', this.pos);
      const nl = this.src.indexOf('\n', this.pos);
      if (close === -1 || (nl !== -1 && nl < close)) {
        this.fail(
          'MMD_UNEXPECTED_TOKEN',
          'A link label opened with "|" is never closed with "|".',
          at
        );
      }
      raw = this.src.slice(this.pos, close);
      this.pos = close;
    }
    this.pos += 1;
    const { text, html } = plainLabel(raw);
    if (html) this.warnOnce('MMD_HTML_STRIPPED', at);
    return text;
  }

  private inlineLabel(
    opener: RegExpExecArray,
    at: number
  ): {
    stroke: LinkStroke;
    start: LinkEnd;
    end: LinkEnd;
    length: number;
    label?: string;
  } {
    this.pos += opener[0].length;
    const kind = opener[2];
    const stroke: LinkStroke =
      kind === '==' ? 'thick' : kind === '-.' ? 'dotted' : 'solid';
    const closeRe =
      kind === '=='
        ? /[ \t]*(={2,})([=>ox])/
        : kind === '-.'
          ? /[ \t]*(\.+)-([>ox])?/
          : /[ \t]*(-{2,})([->ox])/;
    const lineEnd = this.src.indexOf('\n', this.pos);
    const line = this.src.slice(this.pos, lineEnd === -1 ? undefined : lineEnd);
    let labelText: string;
    let closeLen: number;
    let endChar: string | undefined;
    let length = 1;
    if (line.trimStart().startsWith('"')) {
      this.skipBlank();
      labelText = this.quoted();
      const after = this.src.slice(
        this.pos,
        lineEnd === -1 ? undefined : lineEnd
      );
      const m = closeRe.exec(after);
      if (!m || m.index !== 0) {
        this.fail(
          'MMD_BAD_ARROW',
          `The link label after "${kind}" is never closed with a link, such as "-->".`,
          at
        );
      }
      closeLen = m[0].length;
      endChar = m[2];
      length = Math.max(1, m[1].length - 1);
    } else {
      const m = closeRe.exec(line);
      if (!m) {
        this.fail(
          'MMD_BAD_ARROW',
          `The link label after "${kind}" is never closed with a link, such as "${kind === '==' ? '==>' : kind === '-.' ? '.->' : '-->'}".`,
          at
        );
      }
      labelText = line.slice(0, m.index);
      this.pos += m.index;
      closeLen = m[0].length;
      endChar = m[2];
      length = Math.max(1, m[1].length - 1);
    }
    this.pos += closeLen;
    const end: LinkEnd =
      endChar === '>'
        ? 'arrow'
        : endChar === 'o'
          ? 'circle'
          : endChar === 'x'
            ? 'cross'
            : 'none';
    const start: LinkEnd =
      opener[1] === '<'
        ? 'arrow'
        : opener[1] === 'o'
          ? 'circle'
          : opener[1] === 'x'
            ? 'cross'
            : 'none';
    const { text, html } = plainLabel(labelText);
    if (html) this.warnOnce('MMD_HTML_STRIPPED', at);
    return { stroke, start, end, length, label: text };
  }

  // ---------- the result ----------

  private build(): Flowchart {
    // Class and style statements may come before or after their nodes.
    for (const { ids, cls } of this.classUses) {
      for (const id of ids) {
        const node = this.nodes.get(id);
        if (node && !node.classes.includes(cls)) node.classes.push(cls);
      }
    }
    for (const node of this.nodes.values()) {
      for (const cls of node.classes) {
        Object.assign(node.style, this.classDefs.get(cls) ?? {});
      }
    }
    for (const { id, style } of this.nodeStyles) {
      const node = this.nodes.get(id);
      if (node) Object.assign(node.style, style);
    }
    for (const { which, style } of this.linkStyles) {
      const targets =
        which === 'default'
          ? this.edges
          : which
              .map((i) => {
                return this.edges[i];
              })
              .filter(Boolean);
      for (const edge of targets) Object.assign(edge.style, style);
    }
    if (this.styled) this.warnOnce('MMD_STYLE_PARTIAL');
    if (this.edges.length > MAX_EDGES) {
      this.issues.push(
        mermaidError(
          'MMD_TOO_LARGE',
          `The diagram has more than ${MAX_EDGES} links.`
        )
      );
    }
    // Subgraph nesting through membership: a subgraph id listed inside
    // another nests it. A loop is an error.
    for (const sg of this.subgraphs.values()) {
      for (const m of sg.members) {
        const child = this.subgraphs.get(m);
        if (child && child !== sg) child.parent = sg.id;
      }
    }
    for (const sg of this.subgraphs.values()) {
      const seen = new Set<string>();
      let cur: FlowSubgraph | undefined = sg;
      while (cur?.parent) {
        if (seen.has(cur.id) || cur.parent === sg.id) {
          this.issues.push(
            mermaidError(
              'MMD_SUBGRAPH_CYCLE',
              `The subgraph "${sg.title || sg.id}" ends up inside itself.`,
              { line: sg.line, column: sg.column }
            )
          );
          break;
        }
        seen.add(cur.id);
        cur = this.subgraphs.get(cur.parent);
      }
    }
    const depth = (sg: FlowSubgraph): number => {
      let d = 0;
      let cur: FlowSubgraph | undefined = sg;
      while (cur?.parent && d <= this.subgraphs.size) {
        d += 1;
        cur = this.subgraphs.get(cur.parent);
      }
      return d;
    };
    const subgraphs = [...this.subgraphs.values()].sort((a, b) => {
      return depth(a) - depth(b);
    });
    // Edge data statements (`e1@{ animate: true }`) were read as nodes.
    for (const [eid, edge] of this.edgeIds) {
      const node = this.nodes.get(eid);
      if (node && node.label === node.id && /animate/.test(this.src)) {
        const data = new RegExp(`${eid}@\\{([^}]*)\\}`).exec(this.src);
        if (data && /animate\s*:\s*true|animation\s*:/.test(data[1])) {
          edge.animated = true;
        }
        this.nodes.delete(eid);
        for (const sg of this.subgraphs.values()) {
          sg.members = sg.members.filter((m) => {
            return m !== eid;
          });
        }
      }
    }
    return {
      direction: this.direction,
      ...(this.title ? { title: this.title } : {}),
      ...(this.description ? { description: this.description } : {}),
      nodes: [...this.nodes.values()],
      edges: this.edges,
      subgraphs
    };
  }
}

/**
 * Reads a Mermaid flowchart: plain Mermaid text, or Markdown holding a
 * ```mermaid block. Returns the flowchart when there are no errors, and
 * every issue found either way.
 */
export const parseMermaid = (input: string): ParseResult => {
  if (typeof input !== 'string') {
    return { issues: [mermaidError('MMD_NOT_TEXT')] };
  }
  if (input.length > MAX_TEXT_LENGTH) {
    return {
      issues: [
        mermaidError(
          'MMD_TOO_LARGE',
          `The text is ${Math.round(input.length / 1000)} kB; at most ${MAX_TEXT_LENGTH / 1000} kB can be imported.`
        )
      ]
    };
  }
  if (looksBinary(input)) return { issues: [mermaidError('MMD_NOT_TEXT')] };
  let text = input.replace(/^\uFEFF/, '');
  let offset = 0;
  const pre: MermaidIssue[] = [];
  const fenced = extractFence(text);
  if (fenced === 'no-fence') {
    return {
      issues: [
        mermaidError(
          'MMD_NO_HEADER',
          'This Markdown has no ```mermaid block to import.'
        )
      ]
    };
  }
  if (fenced) {
    text = fenced.body;
    offset = fenced.offset;
    if (fenced.extra) pre.push(mermaidWarning('MMD_EXTRA_FENCES'));
  }
  const result = new Parser(text, offset).run();
  return { ...result, issues: [...pre, ...result.issues] };
};
