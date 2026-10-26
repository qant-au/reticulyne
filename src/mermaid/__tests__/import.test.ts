import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sceneSchema, type DiagramView, type Scene } from 'src/core';
import { mermaidToScene, hexColour } from '../import';
import { sceneToMermaid } from '../export';
import { parseMermaid } from '../parse';
import { layoutFlowchart, rankNodes } from '../layout';
import { isError } from '../issues';
import { MERMAID_SHAPE_PROP } from '../shapes';

const CORPUS = join(__dirname, 'corpus');
const valid = readdirSync(join(CORPUS, 'valid')).sort();
const read = (name: string) => {
  return readFileSync(join(CORPUS, 'valid', name), 'utf8');
};

const imported = (text: string): Scene => {
  const result = mermaidToScene(text);
  expect(result.issues.filter(isError)).toEqual([]);
  return result.scene!;
};

const view = (scene: Scene) => {
  return scene.views![0] as DiagramView;
};

const key = (t: { x: number; y: number }) => {
  return `${t.x},${t.y}`;
};

describe('mermaidToScene on the valid corpus', () => {
  it.each(valid)('%s imports as a valid scene, one node a tile', (name) => {
    const scene = imported(read(name));
    expect(sceneSchema.safeParse(scene).success).toBe(true);
    const tiles = view(scene).placements!.map((p) => {
      return key(p.tile);
    });
    expect(new Set(tiles).size).toBe(tiles.length);
    expect(scene.objects.length).toBe(tiles.length);
  });

  it.each(valid)('%s keeps every subgraph inside its own strip', (name) => {
    const parsed = parseMermaid(read(name)).flowchart!;
    if (!parsed.subgraphs.length) return;
    const groupOf = new Map<string, string>();
    for (const s of parsed.subgraphs) {
      for (const m of s.members) groupOf.set(m, s.id);
    }
    const { tiles, boxes } = layoutFlowchart({
      direction: parsed.direction,
      nodes: parsed.nodes.map((n) => {
        return n.id;
      }),
      edges: parsed.edges,
      groups: parsed.subgraphs.map((s) => {
        return {
          id: s.id,
          parent: s.parent,
          nodes: s.members.filter((m) => {
            return groupOf.get(m) === s.id;
          })
        };
      })
    });
    const within = (id: string, sg: string): boolean => {
      const g = groupOf.get(id);
      if (!g) return false;
      if (g === sg) return true;
      let cur = parsed.subgraphs.find((s) => {
        return s.id === g;
      });
      while (cur?.parent) {
        if (cur.parent === sg) return true;
        const parent = cur.parent;
        cur = parsed.subgraphs.find((s) => {
          return s.id === parent;
        });
      }
      return false;
    };
    for (const [sg, box] of boxes) {
      for (const [id, t] of tiles) {
        const inside =
          t.x >= box.from.x &&
          t.x <= box.to.x &&
          t.y >= box.from.y &&
          t.y <= box.to.y;
        expect([sg, id, inside]).toEqual([sg, id, within(id, sg)]);
      }
    }
  });
});

describe('mermaidToScene', () => {
  it('turns nodes into objects with their shape drawing and name', () => {
    const scene = imported(read('basic-lr.mmd'));
    expect(
      scene.objects.map((o) => {
        return [o.id, o.name, o.icon];
      })
    ).toEqual([
      ['A', 'Start', 'reticulyne-flow-process'],
      ['B', 'Is it?', 'reticulyne-flow-decision'],
      ['C', 'OK', 'reticulyne-flow-process'],
      ['D', 'Rethink', 'reticulyne-flow-process'],
      ['E', 'End', 'reticulyne-flow-process']
    ]);
    expect(scene.objects[1].links).toEqual([
      { source: 'reticulyne', ref: 'flow-decision' }
    ]);
    expect(
      scene.icons!.map((i) => {
        return i.id;
      })
    ).toEqual(['reticulyne-flow-decision', 'reticulyne-flow-process']);
  });

  it('lays a flow out along its direction', () => {
    const lr = view(imported('flowchart LR\n a --> b --> c'));
    const xs = lr.placements!.map((p) => {
      return p.tile.x;
    });
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    const td = view(imported('flowchart TD\n a --> b --> c'));
    const ys = td.placements!.map((p) => {
      return p.tile.y;
    });
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(ys[1]).toBeGreaterThan(ys[2]);
    const rl = view(imported('flowchart RL\n a --> b'));
    expect(rl.placements![0].tile.x).toBeGreaterThan(rl.placements![1].tile.x);
    const bt = view(imported('flowchart BT\n a --> b'));
    expect(bt.placements![0].tile.y).toBeLessThan(bt.placements![1].tile.y);
  });

  it('turns links into connectors with direction, style and label', () => {
    const scene = imported(read('link-types.mmd'));
    const by = new Map(
      view(scene).connectors!.map((c) => {
        return [
          c.anchors[1].ref && 'object' in c.anchors[1].ref
            ? c.anchors[1].ref.object
            : '',
          c
        ];
      })
    );
    expect(by.get('B')).toMatchObject({ direction: 'START_TO_END' });
    expect(by.get('C')).toMatchObject({ direction: 'NONE' });
    expect(by.get('D')).toMatchObject({ style: 'DOTTED' });
    expect(by.get('F')).toMatchObject({ width: 16 });
    expect(by.get('H')).toBeUndefined();
    expect(by.get('I')).toMatchObject({ glyph: 'circle-outline' });
    expect(by.get('L')).toMatchObject({ direction: 'BOTH' });
    const labels = imported(read('link-labels.mmd'));
    expect(view(labels).connectors![0].description).toBe('text on link');
  });

  it('turns subgraphs into nested groups', () => {
    const v = view(imported(read('nested-subgraphs.mmd')));
    expect(v.groups).toEqual([
      { id: 'outer', name: 'Outer' },
      { id: 'inner', name: 'Inner', group: 'outer' }
    ]);
    const groupOf = Object.fromEntries(
      v.placements!.map((p) => {
        return [p.object, p.group];
      })
    );
    expect(groupOf).toEqual({ x: 'inner', y: 'inner', z: 'outer' });
  });

  it('docks a link to a subgraph on its first node, and warns', () => {
    const result = mermaidToScene(read('link-to-subgraph.mmd'));
    const ends = view(result.scene!).connectors!.map((c) => {
      return c.anchors.map((a) => {
        return 'object' in a.ref ? a.ref.object : '';
      });
    });
    expect(ends).toEqual([
      ['s1', 's2'],
      ['start', 's1'],
      ['s1', 'finish']
    ]);
    expect(
      result.issues.map((i) => {
        return i.code;
      })
    ).toContain('MMD_SUBGRAPH_LINK');
  });

  it('leaves out a self loop, saying so', () => {
    const result = mermaidToScene(read('self-loop.mmd'));
    expect(view(result.scene!).connectors).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ code: 'MMD_SELF_LOOP', line: 2 });
  });

  it('carries link colour and dashes from linkStyle', () => {
    const scene = imported(read('styles-and-classes.mmd'));
    expect(view(scene).connectors![0]).toMatchObject({
      style: 'DASHED',
      color: 'mermaid-1'
    });
    expect(scene.colors).toEqual([{ id: 'mermaid-1', value: '#999999' }]);
    expect(hexColour('#F66')).toBe('#ff6666');
    expect(hexColour('red')).toBeUndefined();
  });

  it('records an approximated shape so it exports back the same', () => {
    const result = mermaidToScene(
      'flowchart LR\n a@{ shape: lin-doc, label: "Ledger" }'
    );
    expect(result.scene!.objects[0]).toMatchObject({
      icon: 'reticulyne-flow-document',
      props: { [MERMAID_SHAPE_PROP]: 'lin-doc' }
    });
    expect(result.issues[0].code).toBe('MMD_SHAPE_APPROXIMATED');
    expect(
      sceneToMermaid(result.scene!, { syntax: 'extended' }).text
    ).toContain('a@{ shape: lin-doc, label: "Ledger" }');
  });

  it('cuts a long label to a name and keeps it whole as the description', () => {
    const result = mermaidToScene(read('long-label.mmd'));
    const a = result.scene!.objects[0];
    expect(a.name!.length).toBe(100);
    expect(a.name!.endsWith('…')).toBe(true);
    expect(a.description!.length).toBeGreaterThan(100);
    expect(
      result.issues.map((i) => {
        return i.code;
      })
    ).toContain('MMD_LABEL_TRUNCATED');
  });

  it('makes valid scene ids from any Mermaid id', () => {
    const scene = imported(read('unicode.mmd'));
    expect(
      scene.objects.map((o) => {
        return o.id;
      })
    ).toEqual(['debut', 'node', 'node-2', 'node-3']);
    expect(scene.objects[0].name).toBe('Entrée');
  });

  it('takes the title and description from the flowchart', () => {
    expect(imported(read('acc.mmd'))).toMatchObject({
      title: 'Big decisions',
      description: 'A flow of choices'
    });
    expect(imported('flowchart LR\n a').title).toBe('Imported flowchart');
    expect(
      mermaidToScene('flowchart LR\n a', { title: 'Mine', view: 'schematic' })
        .scene
    ).toMatchObject({ title: 'Mine', views: [{ kind: 'schematic' }] });
  });

  it('returns no scene when the text has errors', () => {
    const result = mermaidToScene('flowchart LR\n A -> B');
    expect(result.scene).toBeUndefined();
    expect(result.issues[0].code).toBe('MMD_BAD_ARROW');
  });

  it('carries an animated link', () => {
    const scene = imported(read('edge-ids-animated.mmd'));
    expect(view(scene).connectors![0].animated).toBe(true);
  });
});

describe('the layout', () => {
  it('ranks by longest path and breaks cycles', () => {
    const rank = rankNodes(
      ['a', 'b', 'c', 'd'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
        { from: 'a', to: 'd', length: 3 }
      ]
    );
    expect(Object.fromEntries(rank)).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });

  it('handles a long chain without overflowing', () => {
    const nodes = Array.from({ length: 5000 }, (_, i) => {
      return `n${i}`;
    });
    const edges = nodes.slice(1).map((n, i) => {
      return { from: nodes[i], to: n };
    });
    expect(rankNodes(nodes, edges).get('n4999')).toBe(4999);
  });

  it('untangles a crossing', () => {
    const { tiles } = layoutFlowchart({
      direction: 'LR',
      nodes: ['a', 'b', 'x', 'y'],
      edges: [
        { from: 'a', to: 'y' },
        { from: 'b', to: 'x' }
      ],
      groups: []
    });
    const above = (p: string, q: string) => {
      return tiles.get(p)!.y > tiles.get(q)!.y;
    };
    expect(above('a', 'b')).toBe(above('y', 'x'));
  });
});

describe('round trip', () => {
  it.each(valid)('%s: Mermaid to scene to Mermaid keeps the graph', (name) => {
    const first = parseMermaid(read(name)).flowchart!;
    const scene = imported(read(name));
    const again = parseMermaid(
      sceneToMermaid(scene, { syntax: 'extended' }).text
    ).flowchart!;
    // Labels and shapes of every node come back.
    const nodes = (f: typeof first) => {
      return f.nodes
        .map((n) => {
          return `${n.label.replace(/\s*\n\s*/g, ' ').slice(0, 99)}|${n.shape}`;
        })
        .sort();
    };
    expect(nodes(again)).toEqual(nodes(first));
    // Visible links between nodes (self loops dropped) come back.
    const visible = first.edges.filter((e) => {
      return e.stroke !== 'invisible' && e.from !== e.to;
    });
    expect(
      again.edges.filter((e) => {
        return e.stroke !== 'invisible';
      })
    ).toHaveLength(visible.length);
  });

  it('scene to Mermaid to scene keeps nodes, links, labels and groups', () => {
    const samples = ['three-tier-web.json', 'aws-serverless.json'];
    for (const sample of samples) {
      const scene: Scene = JSON.parse(
        readFileSync(join(__dirname, '../../../samples', sample), 'utf8')
      );
      const text = sceneToMermaid(scene).text;
      const back = imported(text);
      const original = view(scene);
      expect(back.objects.length).toBe(
        original.placements!.length +
          (text.match(/^ {2}note_\S+\[/gm)?.length ?? 0)
      );
      const linkCount = view(back).connectors?.length ?? 0;
      expect(linkCount).toBe(original.connectors!.length);
      const names = (s: Scene) => {
        return s.objects
          .map((o) => {
            return o.name;
          })
          .sort();
      };
      for (const n of names(scene)) expect(names(back)).toContain(n);
    }
  });
});
