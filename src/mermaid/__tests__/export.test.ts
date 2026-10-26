import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Scene } from 'src/core';
import { sceneToMermaid, mermaidText, plainText } from '../export';
import { parseMermaid } from '../parse';
import { isError } from '../issues';
import { MERMAID_SHAPE_PROP } from '../shapes';
import { BUILTIN_PACK } from 'src/icons/builtin';

// A scene lists the icons its objects use.
const withIcons = (s: Scene): Scene => {
  const used = new Set(
    s.objects.map((o) => {
      return o.icon;
    })
  );
  return {
    ...s,
    icons: BUILTIN_PACK.icons.filter((i) => {
      return used.has(i.id);
    })
  };
};

// The goldens are the export of every sample scene, reviewed once and kept:
// `UPDATE_MERMAID_GOLDEN=1 npx jest src/mermaid` rewrites them after a
// deliberate change, and the diff is the review.
const ROOT = join(__dirname, '../../..');
const GOLDEN = join(__dirname, 'golden');
const SCENES = [
  ...readdirSync(join(ROOT, 'samples'))
    .filter((f) => {
      return f.endsWith('.json');
    })
    .map((f) => {
      return join('samples', f);
    }),
  ...readdirSync(join(ROOT, 'demos/scenes')).map((f) => {
    return join('demos/scenes', f);
  })
];

const load = (path: string): Scene => {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
};

const scene = (
  view: Partial<Scene['views'] extends (infer V)[] | undefined ? V : never>,
  extra: Partial<Scene> = {}
): Scene => {
  return {
    format: 'reticulyne-scene',
    version: 2,
    id: 'test',
    objects: [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' }
    ],
    views: [
      {
        id: 'v',
        name: 'View',
        kind: 'iso',
        placements: [
          { object: 'a', tile: { x: 0, y: 0 } },
          { object: 'b', tile: { x: 4, y: 0 } },
          { object: 'c', tile: { x: 8, y: 0 } }
        ],
        ...view
      } as Scene['views'] extends (infer V)[] | undefined ? V : never
    ],
    ...extra
  } as Scene;
};

const link = (id: string, from: string, to: string, extra = {}) => {
  return {
    id,
    anchors: [
      { id: `${id}-a`, ref: { object: from } },
      { id: `${id}-b`, ref: { object: to } }
    ],
    ...extra
  };
};

describe('sceneToMermaid on the sample scenes', () => {
  it.each(SCENES)('%s matches its golden and reads back cleanly', (path) => {
    const result = sceneToMermaid(load(path));
    const golden = join(GOLDEN, `${path.replace(/[/\\]/g, '__')}.mmd`);
    if (process.env.UPDATE_MERMAID_GOLDEN || !existsSync(golden)) {
      writeFileSync(golden, result.text);
    }
    expect(result.text).toBe(readFileSync(golden, 'utf8'));
    const back = parseMermaid(result.text);
    expect(back.issues.filter(isError)).toEqual([]);
    expect(
      back.flowchart!.edges.filter((e) => {
        return e.stroke !== 'invisible';
      })
    ).toHaveLength(result.stats.links);
  });

  it.each(SCENES)('%s exports the same text every time', (path) => {
    expect(sceneToMermaid(load(path)).text).toBe(
      sceneToMermaid(load(path)).text
    );
  });

  it.each(SCENES)('%s reads back in extended syntax too', (path) => {
    const result = sceneToMermaid(load(path), { syntax: 'extended' });
    expect(parseMermaid(result.text).issues.filter(isError)).toEqual([]);
  });
});

describe('sceneToMermaid', () => {
  it('writes nodes, links, direction and title', () => {
    const result = sceneToMermaid(
      scene(
        { connectors: [link('l1', 'a', 'b', { description: 'HTTPS' })] },
        { title: 'Shop' }
      ),
      { direction: 'TB' }
    );
    expect(result.text).toBe(
      [
        '---',
        'title: "Shop"',
        '---',
        'flowchart TB',
        '  a["Alpha"]',
        '  b["Beta"]',
        '  c["Gamma"]',
        '  a -->|"HTTPS"| b',
        ''
      ].join('\n')
    );
    expect(result.stats).toEqual({ nodes: 3, links: 1, subgraphs: 0 });
  });

  it('maps direction and style onto arrows', () => {
    const arrows = sceneToMermaid(
      scene(
        {
          connectors: [
            link('l1', 'a', 'b', { direction: 'NONE' }),
            link('l2', 'a', 'b', { direction: 'BOTH' }),
            link('l3', 'a', 'b', { direction: 'END_TO_START' }),
            link('l4', 'a', 'b', { style: 'DOTTED' }),
            link('l5', 'a', 'b', { style: 'DASHED', color: 'red' }),
            link('l6', 'a', 'b', { width: 20 })
          ]
        },
        { colors: [{ id: 'red', value: '#ff0000' }] }
      )
    ).text.split('\n');
    expect(arrows).toEqual(
      expect.arrayContaining([
        '  a --- b',
        '  a <--> b',
        '  b --> a',
        '  a -.-> b',
        '  a -.-> b',
        '  a ==> b',
        '  linkStyle 4 stroke:#ff0000,stroke-dasharray:6 4'
      ])
    );
  });

  it('labels a connector from its connection when it has no description', () => {
    const text = sceneToMermaid(
      scene(
        { connectors: [link('l1', 'a', 'b', { connection: 'k' })] },
        {
          connections: [
            { id: 'k', from: 'a', to: 'b', name: 'Uplink', kind: 'fibre' }
          ]
        }
      )
    ).text;
    expect(text).toContain('a -->|"Uplink (fibre)"| b');
  });

  it('writes a connection with no connector as a dotted link, and warns', () => {
    const result = sceneToMermaid(
      scene(
        {},
        { connections: [{ id: 'k', from: 'a', to: 'c', name: 'Backup' }] }
      )
    );
    expect(result.text).toContain('a -.->|"Backup"| c');
    expect(
      result.warnings.map((w) => {
        return w.code;
      })
    ).toContain('MMD_CONNECTION_UNDRAWN');
  });

  it('adds port names when asked', () => {
    const s = scene(
      { connectors: [link('l1', 'a', 'b', { connection: 'k' })] },
      {
        connections: [
          { id: 'k', from: 'a', to: 'b', fromPort: 'p1', toPort: 'p2' }
        ]
      }
    );
    s.objects[0].ports = [{ id: 'p1', name: 'eth1' }];
    s.objects[1].ports = [{ id: 'p2', name: 'wan' }];
    expect(sceneToMermaid(s, { ports: true }).text).toContain(
      'a -->|"eth1 to wan"| b'
    );
  });

  it('nests zones by containment and titles them from a nearby text box', () => {
    const text = sceneToMermaid(
      scene({
        rectangles: [
          {
            id: 'outer',
            from: { x: -1, y: -1 },
            to: { x: 9, y: 1 },
            colorValue: '#aabbcc'
          },
          { id: 'inner', from: { x: 3, y: -1 }, to: { x: 9, y: 1 } },
          { id: 'empty', from: { x: 50, y: 50 }, to: { x: 52, y: 52 } }
        ],
        textBoxes: [{ id: 't', tile: { x: 6, y: 3 }, content: 'Servers' }]
      })
    ).text;
    expect(text).toContain(
      [
        '  subgraph outer [" "]',
        '    subgraph inner ["Servers"]',
        '      b["Beta"]',
        '      c["Gamma"]',
        '    end',
        '    a["Alpha"]',
        '  end'
      ].join('\n')
    );
    expect(text).toContain('style outer fill:#aabbcc');
    expect(text).not.toContain('empty');
  });

  it('writes groups as dashed subgraphs and a collapsed group as one node', () => {
    const grouped = scene({
      groups: [{ id: 'g1', name: 'Pair' }],
      connectors: [link('l1', 'a', 'c')]
    });
    const view = grouped.views![0] as { placements: { group?: string }[] };
    view.placements[0].group = 'g1';
    view.placements[1].group = 'g1';
    expect(sceneToMermaid(grouped).text).toContain(
      'subgraph g1 ["Pair"]\n    a["Alpha"]\n    b["Beta"]\n  end'
    );
    const collapsed = structuredClone(grouped);
    (
      collapsed.views![0] as { groups: { collapsed?: boolean }[] }
    ).groups[0].collapsed = true;
    const text = sceneToMermaid(collapsed).text;
    expect(text).toContain('g1[["Pair"]]');
    expect(text).toContain('g1 --> c');
    expect(text).not.toContain('Alpha');
  });

  it('writes a free connector end as a junction node', () => {
    const text = sceneToMermaid(
      scene({
        connectors: [
          {
            id: 'l1',
            anchors: [
              { id: 'x', ref: { object: 'a' } },
              { id: 'y', ref: { tile: { x: 2, y: 2 } } }
            ]
          }
        ]
      }),
      { syntax: 'extended' }
    ).text;
    expect(text).toContain('j_y@{ shape: f-circ, label: " " }');
    expect(text).toContain('a --> j_y');
  });

  it('writes a text box away from any zone as a note tied to the nearest node', () => {
    const result = sceneToMermaid(
      scene({
        textBoxes: [{ id: 't', tile: { x: 1, y: 1 }, content: 'Mind the gap' }]
      })
    );
    expect(result.text).toContain('note_t["Mind the gap"]');
    expect(result.text).toContain('note_t ~~~ a');
  });

  it('uses a shape from the drawing, the recorded prop, or a plain box', () => {
    const s = scene({});
    s.objects[0].icon = 'reticulyne-flow-decision';
    s.objects[1].props = { [MERMAID_SHAPE_PROP]: 'lean-l' };
    s.objects[2].icon = 'reticulyne-router';
    const result = sceneToMermaid(withIcons(s));
    expect(result.text).toContain('a{"Alpha"}');
    expect(result.text).toContain('b[\\"Beta"\\]');
    expect(result.text).toContain('c["Gamma"]');
    expect(
      result.warnings.map((w) => {
        return w.code;
      })
    ).toContain('MMD_ICON_LOST');
    const extended = scene({});
    extended.objects[0].icon = 'reticulyne-flow-document';
    expect(sceneToMermaid(withIcons(extended)).text).toContain('a["Alpha"]');
    expect(
      sceneToMermaid(withIcons(extended), { syntax: 'extended' }).text
    ).toContain('a@{ shape: doc, label: "Alpha" }');
  });

  it('falls back from name to icon name to element for a label', () => {
    const s = scene({});
    delete s.objects[0].name;
    s.objects[0].icon = 'reticulyne-router';
    delete s.objects[1].name;
    delete s.objects[2].name;
    s.objects[2].element = 'thing';
    const text = sceneToMermaid(withIcons(s)).text;
    expect(text).toContain('a["Router"]');
    expect(text).toContain('b["Untitled"]');
    expect(text).toContain('c["thing"]');
  });

  it('leaves out hidden layers and plan views, saying so', () => {
    const s = scene(
      { connectors: [link('l1', 'a', 'b', { layer: 'off' })] },
      {
        layers: [{ id: 'off', name: 'Off', visible: false }]
      }
    );
    s.views!.push({ id: 'p', name: 'Plan', kind: 'plan', floors: [] });
    const result = sceneToMermaid(s);
    expect(result.stats.links).toBe(0);
    expect(
      result.warnings.map((w) => {
        return w.code;
      })
    ).toEqual(
      expect.arrayContaining([
        'MMD_HIDDEN_LAYER_SKIPPED',
        'MMD_PLAN_VIEW_SKIPPED'
      ])
    );
  });

  it('makes safe, unique ids that are never keywords', () => {
    const s = scene({});
    s.objects[0].id = 'end';
    s.objects[1].id = 'web-server';
    s.objects[2].id = 'web_server';
    s.views = [
      {
        id: 'v',
        name: 'v',
        kind: 'iso',
        placements: [
          { object: 'end', tile: { x: 0, y: 0 } },
          { object: 'web-server', tile: { x: 1, y: 0 } },
          { object: 'web_server', tile: { x: 2, y: 0 } }
        ],
        connectors: [link('l', 'end', 'web-server')]
      }
    ];
    const text = sceneToMermaid(s).text;
    expect(text).toContain('end_["Alpha"]');
    expect(text).toContain('web_server["Beta"]');
    expect(text).toContain('web_server_2["Gamma"]');
    expect(text).toContain('end_ --> web_server');
    expect(parseMermaid(text).issues.filter(isError)).toEqual([]);
  });

  it('escapes what Mermaid would read, and reads it back unchanged', () => {
    const nasty = 'Say "hi" <b>|x|</b> #1 `tick`';
    expect(mermaidText(`${nasty}\nnext`)).toBe(
      'Say #quot;hi#quot; #lt;b#gt;#124;x#124;#lt;/b#gt; #35;1 #96;tick#96;<br/>next'
    );
    const s = scene({
      connectors: [link('l', 'a', 'b', { description: 'Line one\nline two' })]
    });
    s.objects[0].name = nasty;
    s.objects[1].name = 'A [weird] {name} (x)';
    const back = parseMermaid(sceneToMermaid(s).text);
    expect(back.issues.filter(isError)).toEqual([]);
    expect(back.flowchart!.nodes[0].label).toBe(nasty);
    expect(back.flowchart!.nodes[1].label).toBe('A [weird] {name} (x)');
    expect(back.flowchart!.edges[0].label).toBe('Line one\nline two');
  });

  it('reads descriptions written as editor HTML', () => {
    expect(plainText('<p>One &amp; two</p><p>three</p>')).toBe(
      'One & two\nthree'
    );
  });

  it('wraps the text in a fence for Markdown', () => {
    const text = sceneToMermaid(scene({}), { markdown: true }).text;
    expect(text.startsWith('```mermaid\nflowchart LR\n')).toBe(true);
    expect(text.endsWith('```\n')).toBe(true);
  });

  it('writes an animated connector with an edge id in extended syntax', () => {
    const text = sceneToMermaid(
      scene({ connectors: [link('l1', 'a', 'b', { animated: true })] }),
      { syntax: 'extended' }
    ).text;
    expect(text).toContain('a e_l1@--> b');
    expect(text).toContain('e_l1@{ animate: true }');
  });

  it('throws on something that is not a diagram', () => {
    expect(() => {
      return sceneToMermaid({ nope: true });
    }).toThrow(/Not a diagram/);
  });
});
