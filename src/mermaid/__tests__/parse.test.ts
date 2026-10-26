import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMermaid, MAX_TEXT_LENGTH, type Flowchart } from '../parse';
import { isError } from '../issues';

const corpus = (kind: 'valid' | 'invalid') => {
  const dir = join(__dirname, 'corpus', kind);
  return readdirSync(dir)
    .sort()
    .map((name) => {
      return { name, text: readFileSync(join(dir, name), 'utf8') };
    });
};

const read = (text: string): Flowchart => {
  const result = parseMermaid(text);
  const errors = result.issues.filter(isError);
  expect(errors).toEqual([]);
  return result.flowchart!;
};

const file = (kind: 'valid' | 'invalid', name: string) => {
  return readFileSync(join(__dirname, 'corpus', kind, name), 'utf8');
};

const edgeList = (f: Flowchart) => {
  return f.edges.map((e) => {
    return `${e.from}>${e.to}`;
  });
};

describe('parseMermaid on the valid corpus', () => {
  it.each(corpus('valid'))('reads $name with no errors', ({ text }) => {
    const f = read(text);
    expect(f.nodes.length).toBeGreaterThan(0);
  });

  it('reads nodes, labels, shapes and links in order', () => {
    const f = read(file('valid', 'basic-lr.mmd'));
    expect(f.direction).toBe('LR');
    expect(
      f.nodes.map((n) => {
        return [n.id, n.label, n.shape];
      })
    ).toEqual([
      ['A', 'Start', 'rect'],
      ['B', 'Is it?', 'diam'],
      ['C', 'OK', 'rect'],
      ['D', 'Rethink', 'rect'],
      ['E', 'End', 'rect']
    ]);
    expect(edgeList(f)).toEqual(['A>B', 'B>C', 'C>D', 'D>B', 'B>E']);
    expect(f.edges[1].label).toBe('Yes');
    expect(f.edges[4]).toMatchObject({ label: 'No', length: 3 });
  });

  it('reads every bracket shape', () => {
    const f = read(file('valid', 'all-brackets.mmd'));
    expect(
      f.nodes.map((n) => {
        return n.shape;
      })
    ).toEqual([
      'rect',
      'rounded',
      'stadium',
      'fr-rect',
      'cyl',
      'circle',
      'odd',
      'diam',
      'hex',
      'lean-r',
      'lean-l',
      'trap-b',
      'trap-t',
      'dbl-circ'
    ]);
    expect(f.nodes[13].label).toBe('Double');
  });

  it('reads @{ } node data, on one line or several', () => {
    const f = read(file('valid', 'shape-data.mmd'));
    expect(
      f.nodes.map((n) => {
        return [n.id, n.shape, n.label];
      })
    ).toEqual([
      ['A', 'flip-tri', 'File Handling'],
      ['B', 'diam', 'Decision'],
      ['C', 'docs', 'C'],
      ['D', 'cyl', 'DB, main']
    ]);
    const multi = read(file('valid', 'multiline-shape-data.mmd'));
    expect(multi.nodes[0]).toMatchObject({
      shape: 'rounded',
      label: 'Multi line data'
    });
  });

  it('reads every kind of link', () => {
    const f = read(file('valid', 'link-types.mmd'));
    const kinds = f.edges.map((e) => {
      return `${e.to}:${e.stroke}:${e.start}:${e.end}`;
    });
    expect(kinds).toEqual([
      'B:solid:none:arrow',
      'C:solid:none:none',
      'D:dotted:none:arrow',
      'E:dotted:none:none',
      'F:thick:none:arrow',
      'G:thick:none:none',
      'H:invisible:none:none',
      'I:solid:none:circle',
      'J:solid:none:cross',
      'L:solid:arrow:arrow',
      'N:solid:circle:circle',
      'Q:solid:cross:cross',
      'S:solid:none:arrow',
      'U:dotted:none:arrow',
      'W:thick:none:arrow'
    ]);
    expect(
      f.edges.map((e) => {
        return e.length;
      })
    ).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3]);
  });

  it('reads link labels in all four forms', () => {
    const f = read(file('valid', 'link-labels.mmd'));
    expect(
      f.edges.map((e) => {
        return [e.to, e.stroke, e.label];
      })
    ).toEqual([
      ['B', 'solid', 'text on link'],
      ['C', 'solid', 'piped text'],
      ['D', 'dotted', 'dotted text'],
      ['E', 'thick', 'thick text'],
      ['F', 'solid', 'quoted, label'],
      ['G', 'solid', 'quoted pipe']
    ]);
  });

  it('expands chains and & groups', () => {
    const f = read(file('valid', 'chains-and-ampersand.mmd'));
    expect(edgeList(f)).toEqual([
      'a>b',
      'a>c',
      'b>d',
      'c>d',
      'e>g',
      'e>h',
      'f>g',
      'f>h'
    ]);
  });

  it('reads subgraphs, their titles, members and direction', () => {
    const f = read(file('valid', 'subgraphs.mmd'));
    expect(
      f.subgraphs.map((s) => {
        return [s.id, s.title, s.members, s.direction];
      })
    ).toEqual([
      ['one', 'one', ['a1', 'a2'], undefined],
      ['two', 'Second group', ['b1', 'b2'], 'LR'],
      ['three', 'three', ['c1', 'c2'], undefined]
    ]);
    expect(edgeList(f)).toContain('one>two');
  });

  it('nests subgraphs', () => {
    const f = read(file('valid', 'nested-subgraphs.mmd'));
    expect(
      f.subgraphs.map((s) => {
        return [s.id, s.parent, s.members];
      })
    ).toEqual([
      ['outer', undefined, ['inner', 'z']],
      ['inner', 'outer', ['x', 'y']]
    ]);
  });

  it('takes a whole line as a subgraph title', () => {
    const f = read(file('valid', 'subgraph-title-only.mmd'));
    expect(
      f.subgraphs.map((s) => {
        return s.title;
      })
    ).toEqual(['A quoted title', 'Some words for a title']);
  });

  it('applies classDef, class, style and linkStyle, and warns', () => {
    const result = parseMermaid(file('valid', 'styles-and-classes.mmd'));
    const f = result.flowchart!;
    expect(f.nodes[0].style).toMatchObject({
      fill: '#bbf',
      stroke: '#f66'
    });
    expect(f.nodes[1].style).toEqual({ fill: '#bbf' });
    expect(f.edges[0].style).toMatchObject({
      stroke: '#999',
      'stroke-dasharray': '5 5'
    });
    expect(
      result.issues.map((i) => {
        return i.code;
      })
    ).toContain('MMD_STYLE_PARTIAL');
  });

  it('skips comments, directives and front matter, keeping the title', () => {
    expect(
      edgeList(read(file('valid', 'comments-and-semicolons.mmd')))
    ).toEqual(['A>B', 'B>C', 'C>D']);
    expect(read(file('valid', 'front-matter.mmd')).title).toBe('Order flow');
    const init = parseMermaid(file('valid', 'init-directive.mmd'));
    expect(init.issues[0].code).toBe('MMD_INIT_IGNORED');
  });

  it('decodes entities, line breaks and markdown, and strips HTML', () => {
    const result = parseMermaid(file('valid', 'entities-and-html.mmd'));
    const labels = result.flowchart!.nodes.map((n) => {
      return n.label;
    });
    expect(labels).toEqual([
      'A double quote:"',
      'A dec char:♥',
      'Line one\nLine two',
      'bold text'
    ]);
    expect(
      result.issues.map((i) => {
        return i.code;
      })
    ).toEqual(['MMD_HTML_STRIPPED']);
    const md = read(file('valid', 'markdown-strings.mmd'));
    expect(md.nodes[0].label).toBe('The cat\n in the hat');
    expect(md.nodes[1].label).toBe('emphasis');
  });

  it('reads Unicode and hyphenated ids', () => {
    expect(
      read(file('valid', 'unicode.mmd')).nodes.map((n) => {
        return n.id;
      })
    ).toEqual(['début', '終了', 'Привет', '你好']);
    expect(edgeList(read(file('valid', 'hyphen-ids.mmd')))).toEqual([
      'web-server>db.primary',
      'a-b-c>d_e'
    ]);
  });

  it('drops click lines with a warning', () => {
    const result = parseMermaid(file('valid', 'click-dropped.mmd'));
    expect(
      result.issues.map((i) => {
        return [i.code, i.line];
      })
    ).toEqual([
      ['MMD_CLICK_DROPPED', 3],
      ['MMD_CLICK_DROPPED', 4]
    ]);
  });

  it('reads an edge id and its animation', () => {
    const f = read(file('valid', 'edge-ids-animated.mmd'));
    expect(f.nodes).toHaveLength(2);
    expect(f.edges[0]).toMatchObject({ id: 'e1', animated: true });
  });

  it('reads accessible title and description', () => {
    expect(read(file('valid', 'acc.mmd'))).toMatchObject({
      title: 'Big decisions',
      description: 'A flow of choices'
    });
    expect(read(file('valid', 'accdescr-block.mmd')).description).toBe(
      'Several lines of description'
    );
  });

  it('reads CRLF line ends and tabs', () => {
    expect(edgeList(read(file('valid', 'crlf-and-tabs.mmd')))).toEqual([
      'A>B',
      'B>C'
    ]);
  });

  it('warns about icon nodes and a node relabelled', () => {
    expect(
      parseMermaid(file('valid', 'icon-node.mmd')).issues.map((i) => {
        return i.code;
      })
    ).toEqual(['MMD_IMAGE_NODE']);
    const dup = parseMermaid(file('valid', 'duplicate-label.mmd'));
    expect(dup.flowchart!.nodes[0].label).toBe('Second');
    expect(dup.issues[0]).toMatchObject({
      code: 'MMD_DUPLICATE_LABEL_ID',
      line: 3
    });
  });

  it('reads legacy directions and flowchart-elk', () => {
    expect(read(file('valid', 'legacy-direction.mmd')).direction).toBe('LR');
    expect(read(file('valid', 'elk.mmd')).direction).toBe('TB');
    expect(read(file('valid', 'no-direction.mmd')).direction).toBe('TB');
  });

  it('takes the diagram out of a Markdown file, keeping line numbers', () => {
    const md = file('valid', 'md-file.md');
    expect(edgeList(read(md))).toEqual(['A>B']);
    const broken = md.replace('A --> B', 'A -> B');
    expect(parseMermaid(broken).issues[0]).toMatchObject({
      code: 'MMD_BAD_ARROW',
      line: 7
    });
    const twice = `${md}\n\`\`\`mermaid\nflowchart LR\n  x --> y\n\`\`\`\n`;
    expect(parseMermaid(twice).issues[0].code).toBe('MMD_EXTRA_FENCES');
  });
});

describe('parseMermaid on the invalid corpus', () => {
  it.each(corpus('invalid'))(
    'refuses $name with its code',
    ({ name, text }) => {
      const result = parseMermaid(text);
      expect(result.flowchart).toBeUndefined();
      const errors = result.issues.filter(isError);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe(name.split('.')[0]);
      expect(errors[0].message.length).toBeGreaterThan(10);
    }
  );

  it('places errors at their line and column', () => {
    const at = (name: string) => {
      const e = parseMermaid(file('invalid', name)).issues.filter(isError)[0];
      return [e.line, e.column];
    };
    expect(at('MMD_BAD_ARROW.single-dash.mmd')).toEqual([2, 5]);
    expect(at('MMD_MISMATCHED_BRACKET.mmd')).toEqual([2, 10]);
    expect(at('MMD_UNCLOSED_SHAPE.square.mmd')).toEqual([2, 4]);
    expect(at('MMD_UNCLOSED_STRING.mmd')).toEqual([2, 5]);
    expect(at('MMD_UNCLOSED_SUBGRAPH.mmd')).toEqual([2, 3]);
    expect(at('MMD_UNEXPECTED_END.mmd')).toEqual([3, 1]);
    expect(at('MMD_BAD_DIRECTION.mmd')).toEqual([1, 11]);
  });

  it('says what was expected', () => {
    const msg = (name: string) => {
      return parseMermaid(file('invalid', name)).issues.filter(isError)[0]
        .message;
    };
    expect(msg('MMD_BAD_ARROW.single-dash.mmd')).toBe(
      '"->" is not a Mermaid link. Did you mean "-->"?'
    );
    expect(msg('MMD_MISMATCHED_BRACKET.mmd')).toContain('expected "]"');
    expect(msg('MMD_UNCLOSED_SUBGRAPH.mmd')).toBe(
      'The subgraph "one" opened on line 2 is never closed with "end".'
    );
    expect(msg('MMD_UNSUPPORTED_DIAGRAM.sequence.mmd')).toContain(
      '"sequenceDiagram" diagrams'
    );
    expect(msg('MMD_RESERVED_ID.end.mmd')).toContain(
      '"end" is a Mermaid keyword'
    );
  });

  it('reports every broken line, not only the first', () => {
    const text =
      'flowchart LR\n  A -> B\n  C[x --> D\n  E --> F\n  G --> end\n';
    const errors = parseMermaid(text).issues.filter(isError);
    expect(
      errors.map((e) => {
        return [e.code, e.line];
      })
    ).toEqual([
      ['MMD_BAD_ARROW', 2],
      ['MMD_UNCLOSED_SHAPE', 3],
      ['MMD_RESERVED_ID', 5]
    ]);
  });

  it('stops collecting at 20 errors', () => {
    const text = `flowchart LR\n${'  A -> B\n'.repeat(50)}`;
    expect(parseMermaid(text).issues.filter(isError)).toHaveLength(20);
  });

  it('refuses binary content and oversized text before reading', () => {
    expect(
      parseMermaid('\u0089PNG\r\n\u001a\n\u0000\u0000').issues[0].code
    ).toBe('MMD_NOT_TEXT');
    expect(parseMermaid('flowchart LR\n A\u0000 --> B').issues[0].code).toBe(
      'MMD_NOT_TEXT'
    );
    expect(
      parseMermaid(`flowchart LR\n${'a'.repeat(MAX_TEXT_LENGTH)}`).issues[0]
        .code
    ).toBe('MMD_TOO_LARGE');
    expect(parseMermaid(undefined as unknown as string).issues[0].code).toBe(
      'MMD_NOT_TEXT'
    );
  });

  it('refuses more nodes than a scene holds', () => {
    const lines = Array.from({ length: 10_001 }, (_, i) => {
      return `  n${i}`;
    });
    const result = parseMermaid(`flowchart LR\n${lines.join('\n')}`);
    expect(result.issues.filter(isError)[0].code).toBe('MMD_TOO_LARGE');
  });
});

describe('parseMermaid never throws', () => {
  it.each(corpus('valid'))('on any prefix or suffix of $name', ({ text }) => {
    for (let i = 0; i <= text.length; i += 1) {
      expect(() => {
        parseMermaid(text.slice(0, i));
        parseMermaid(text.slice(i));
      }).not.toThrow();
    }
  });

  it('on random punctuation soup', () => {
    const chars = '[](){}<>/\\|"`-=.~ox&@:;%#\n AB12';
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let n = 0; n < 2000; n += 1) {
      let body = 'flowchart LR\n';
      for (let i = 0; i < 40; i += 1) {
        body += chars[Math.floor(rand() * chars.length)];
      }
      expect(() => {
        return parseMermaid(body);
      }).not.toThrow();
    }
  });
});
