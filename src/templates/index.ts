import type {
  Colors,
  Connector,
  Icon,
  InitialData,
  ModelItem,
  Rectangle,
  View,
  ViewItem
} from 'src/types';
import { VIEW_ITEM_DEFAULTS } from 'src/config';

// starter diagrams for "New from template". A template holds
// the drawing only; icons and colours come from the editor it is opened
// in, so a host's own icon set and palette stay in charge. Node icons name
// built-in drawings (`reticulyne-<drawing id>`); a host whose
// icon set lacks one gets that node without an icon rather than an error.

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  items: ModelItem[];
  views: View[];
}

interface Node {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
}

const build = (
  id: string,
  name: string,
  description: string,
  nodes: Node[],
  links: [string, string][],
  rectangles: Omit<Rectangle, 'id'>[] = []
): DiagramTemplate => {
  const items: ModelItem[] = nodes.map((n) => {
    return { id: n.id, name: n.name, icon: n.icon };
  });
  const viewItems: ViewItem[] = nodes.map((n) => {
    return { ...VIEW_ITEM_DEFAULTS, id: n.id, tile: { x: n.x, y: n.y } };
  });
  const connectors: Connector[] = links.map(([from, to], i) => {
    return {
      id: `link-${i + 1}`,
      anchors: [
        { id: `link-${i + 1}-a`, ref: { item: from } },
        { id: `link-${i + 1}-b`, ref: { item: to } }
      ]
    };
  });
  return {
    id,
    name,
    description,
    items,
    views: [
      {
        id: 'main',
        name: 'Main',
        items: viewItems,
        connectors,
        rectangles: rectangles.map((r, i) => {
          return { ...r, id: `zone-${i + 1}` };
        })
      }
    ]
  };
};

export const TEMPLATES: DiagramTemplate[] = [
  build('blank', 'Blank', 'An empty canvas.', [], []),
  build(
    'three-tier-web',
    'Three-tier web app',
    'Users through a load balancer to two web servers, a cache and a database.',
    [
      { id: 'users', name: 'Users', icon: 'reticulyne-user', x: -7, y: 0 },
      {
        id: 'lb',
        name: 'Load balancer',
        icon: 'reticulyne-load-balancer',
        x: -3,
        y: 0
      },
      {
        id: 'web-1',
        name: 'Web 1',
        icon: 'reticulyne-rack-server-1u',
        x: 1,
        y: -2
      },
      {
        id: 'web-2',
        name: 'Web 2',
        icon: 'reticulyne-rack-server-1u',
        x: 1,
        y: 2
      },
      {
        id: 'cache',
        name: 'Cache',
        icon: 'reticulyne-database-service',
        x: 5,
        y: -2
      },
      {
        id: 'db',
        name: 'Database',
        icon: 'reticulyne-storage-array',
        x: 5,
        y: 2
      }
    ],
    [
      ['users', 'lb'],
      ['lb', 'web-1'],
      ['lb', 'web-2'],
      ['web-1', 'cache'],
      ['web-2', 'cache'],
      ['web-1', 'db'],
      ['web-2', 'db']
    ],
    [
      {
        from: { x: 0, y: -3 },
        to: { x: 2, y: 3 },
        colorValue: '#a5b8f3',
        transparency: 0.5
      }
    ]
  ),
  build(
    'aws-web',
    'AWS web application',
    'Route 53 and CloudFront in front of a load-balanced EC2 pair, with RDS and S3.',
    [
      {
        id: 'dns',
        name: 'Route 53',
        icon: 'reticulyne-dns-server',
        x: -8,
        y: 0
      },
      { id: 'cdn', name: 'CloudFront', icon: 'reticulyne-cdn', x: -4, y: 0 },
      {
        id: 'elb',
        name: 'Load balancer',
        icon: 'reticulyne-load-balancer',
        x: 0,
        y: 0
      },
      {
        id: 'ec2-a',
        name: 'App A',
        icon: 'reticulyne-virtual-machine',
        x: 4,
        y: -2
      },
      {
        id: 'ec2-b',
        name: 'App B',
        icon: 'reticulyne-virtual-machine',
        x: 4,
        y: 2
      },
      {
        id: 'rds',
        name: 'RDS',
        icon: 'reticulyne-database-service',
        x: 8,
        y: 0
      },
      {
        id: 's3',
        name: 'Static assets',
        icon: 'reticulyne-object-storage',
        x: -4,
        y: 4
      }
    ],
    [
      ['dns', 'cdn'],
      ['cdn', 'elb'],
      ['cdn', 's3'],
      ['elb', 'ec2-a'],
      ['elb', 'ec2-b'],
      ['ec2-a', 'rds'],
      ['ec2-b', 'rds']
    ],
    [
      {
        from: { x: -1, y: -3 },
        to: { x: 9, y: 3 },
        colorValue: '#fad6ac',
        transparency: 0.5
      }
    ]
  ),
  build(
    'kubernetes',
    'Kubernetes service',
    'An ingress and service in front of three pods sharing a volume claim.',
    [
      {
        id: 'ing',
        name: 'Ingress',
        icon: 'reticulyne-load-balancer',
        x: -6,
        y: 0
      },
      { id: 'svc', name: 'Service', icon: 'reticulyne-api', x: -2, y: 0 },
      { id: 'pod-1', name: 'Pod 1', icon: 'reticulyne-container', x: 2, y: -3 },
      { id: 'pod-2', name: 'Pod 2', icon: 'reticulyne-container', x: 2, y: 0 },
      { id: 'pod-3', name: 'Pod 3', icon: 'reticulyne-container', x: 2, y: 3 },
      { id: 'pvc', name: 'Volume claim', icon: 'reticulyne-nas', x: 6, y: 0 }
    ],
    [
      ['ing', 'svc'],
      ['svc', 'pod-1'],
      ['svc', 'pod-2'],
      ['svc', 'pod-3'],
      ['pod-1', 'pvc'],
      ['pod-2', 'pvc'],
      ['pod-3', 'pvc']
    ],
    [
      {
        from: { x: -3, y: -4 },
        to: { x: 7, y: 4 },
        colorValue: '#a8dc9d',
        transparency: 0.5
      }
    ]
  ),
  build(
    'office-network',
    'Office network',
    'Internet through a firewall and router to a switch, with desktops, a laptop, a printer and a file server.',
    [
      {
        id: 'internet',
        name: 'Internet',
        icon: 'reticulyne-cloud-service',
        x: -8,
        y: 0
      },
      { id: 'fw', name: 'Firewall', icon: 'reticulyne-firewall', x: -4, y: 0 },
      { id: 'router', name: 'Router', icon: 'reticulyne-router', x: 0, y: 0 },
      {
        id: 'switch',
        name: 'Switch',
        icon: 'reticulyne-network-switch',
        x: 4,
        y: 0
      },
      {
        id: 'desk-1',
        name: 'Desktop',
        icon: 'reticulyne-pc-tower',
        x: 8,
        y: -4
      },
      { id: 'laptop', name: 'Laptop', icon: 'reticulyne-laptop', x: 8, y: 0 },
      {
        id: 'printer',
        name: 'Printer',
        icon: 'reticulyne-printer',
        x: 8,
        y: 4
      },
      {
        id: 'files',
        name: 'File server',
        icon: 'reticulyne-rack-server-1u',
        x: 4,
        y: 4
      }
    ],
    [
      ['internet', 'fw'],
      ['fw', 'router'],
      ['router', 'switch'],
      ['switch', 'desk-1'],
      ['switch', 'laptop'],
      ['switch', 'printer'],
      ['switch', 'files']
    ]
  )
];

/**
 * The data to load for a template, using the editor's current icons and
 * colours. Icon references the icon set cannot satisfy are dropped.
 */
export const templateToInitialData = (
  template: DiagramTemplate,
  icons: Icon[],
  colors: Colors
): InitialData => {
  const known = new Set(
    icons.map((icon) => {
      return icon.id;
    })
  );
  return {
    title: template.id === 'blank' ? 'Untitled' : template.name,
    icons,
    colors,
    items: template.items.map((item) => {
      const copy = { ...item };
      if (copy.icon && !known.has(copy.icon)) delete copy.icon;
      return copy;
    }),
    views: template.views,
    fitToView: true
  };
};
