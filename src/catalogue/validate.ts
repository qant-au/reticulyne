import {
  catalogueSchema,
  type Capability,
  type Catalogue,
  type CatalogueItem,
  type Medium,
  type PortRole,
  type PortTemplate
} from './schema';

/** A port template with its pattern expanded: one per real port. */
export type ExpandedPort = Omit<PortTemplate, 'id'> & { id: string };

const PATTERN = /\{(\d+)\.\.(\d+)\}/;

/**
 * An item's ports with patterns expanded: `eth{1..24}` becomes eth1 ..
 * eth24, and `{n}` in the name becomes each port's number.
 */
export const expandPorts = (item: Pick<CatalogueItem, 'ports'>) => {
  return item.ports.flatMap((port): ExpandedPort[] => {
    const match = PATTERN.exec(port.id);
    if (!match) return [port];
    const from = Number(match[1]);
    const to = Number(match[2]);
    const ports: ExpandedPort[] = [];
    for (let n = from; n <= to; n += 1) {
      ports.push({
        ...port,
        id: port.id.replace(PATTERN, String(n)),
        ...(port.name ? { name: port.name.replace(/\{n\}/g, String(n)) } : {})
      });
    }
    return ports;
  });
};

export interface CatalogueIssue {
  /** Where: 'media.rs-485', 'items.poe-switch-8.ports.eth3'. */
  path: string;
  message: string;
}

export type CatalogueResult =
  { ok: true; catalogue: Catalogue } | { ok: false; issues: CatalogueIssue[] };

// Where each port role may appear, by the medium's topology.
const roleAllowed = (
  role: PortRole,
  medium: Medium,
  item: CatalogueItem
): boolean => {
  switch (role) {
    case 'device':
      return true;
    case 'through':
      return medium.topology === 'bus' || medium.topology === 'loop';
    case 'backbone':
    case 'drop':
      return medium.topology === 'bus';
    case 'loop-out':
    case 'loop-return':
      return medium.topology === 'loop';
    case 'hub':
      // Also on virtual items: the internet's WAN ports take any number.
      return medium.topology === 'wireless' || item.virtual === true;
    case 'client':
    case 'peer':
      return medium.topology === 'wireless';
  }
};

const capabilityAllowed = (cap: Capability, medium: Medium): boolean => {
  switch (cap) {
    case 'poe-pse':
    case 'poe-pd':
      return medium.family === 'ethernet';
    case 'power-in':
    case 'power-out':
      return medium.family === 'power';
    case 'bus-power':
      return medium.topology === 'bus' || medium.topology === 'loop';
    case 'terminator':
      return medium.termination === 'both-ends';
    case 'eol':
      return medium.termination === 'eol';
    case 'isolator':
      return medium.topology === 'loop';
  }
};

const duplicates = (ids: string[]) => {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
};

/**
 * Checks a catalogue: the shape of every entry, then the rules in
 * docs/catalogue.md. Every medium, connector and protocol referenced
 * exists; a connector belongs to its medium and a protocol rides on it;
 * port ids are unique after expansion; roles and capabilities fit the
 * medium; and an item has a port that is not power, unless it is virtual.
 * Cross-references (`links`) are not checked: a missing element is fine.
 */
export const validateCatalogue = (input: unknown): CatalogueResult => {
  const parsed = catalogueSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => {
        return { path: issue.path.join('.'), message: issue.message };
      })
    };
  }
  const catalogue = parsed.data;
  const issues: CatalogueIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path, message });
  };

  for (const [registry, entries] of [
    ['media', catalogue.media],
    ['protocols', catalogue.protocols],
    ['items', catalogue.items]
  ] as const) {
    for (const id of duplicates(
      entries.map((e) => {
        return e.id;
      })
    )) {
      add(`${registry}.${id}`, `Duplicate id "${id}"`);
    }
  }

  const media = new Map(
    catalogue.media.map((m) => {
      return [m.id, m];
    })
  );
  const protocols = new Map(
    catalogue.protocols.map((p) => {
      return [p.id, p];
    })
  );

  for (const medium of catalogue.media) {
    const at = `media.${medium.id}`;
    if (medium.basedOn !== undefined && !media.has(medium.basedOn)) {
      add(at, `basedOn "${medium.basedOn}" is not a medium`);
    }
    if (medium.topology !== 'bus') {
      if (medium.termination) add(at, 'termination is for bus media only');
      if (medium.busPower) add(at, 'busPower is for bus media only');
    }
    for (const id of medium.protocols ?? []) {
      const protocol = protocols.get(id);
      if (!protocol) add(at, `Protocol "${id}" does not exist`);
      else if (!protocol.media.includes(medium.id)) {
        add(at, `Protocol "${id}" does not list this medium`);
      }
    }
  }

  for (const protocol of catalogue.protocols) {
    for (const id of protocol.media) {
      const medium = media.get(id);
      if (!medium)
        add(`protocols.${protocol.id}`, `Medium "${id}" does not exist`);
      else if (!medium.protocols?.includes(protocol.id)) {
        add(
          `protocols.${protocol.id}`,
          `Medium "${id}" does not list this protocol`
        );
      }
    }
  }

  for (const item of catalogue.items) {
    const at = `items.${item.id}`;
    const ports = expandPorts(item);
    for (const id of duplicates(
      ports.map((p) => {
        return p.id;
      })
    )) {
      add(`${at}.ports.${id}`, `Duplicate port id "${id}"`);
    }
    for (const port of ports) {
      const pat = `${at}.ports.${port.id}`;
      const medium = media.get(port.medium);
      if (!medium) {
        add(pat, `Medium "${port.medium}" does not exist`);
        continue;
      }
      if (port.connector && !medium.connectors.includes(port.connector)) {
        add(pat, `Connector "${port.connector}" is not on ${medium.id}`);
      }
      for (const id of port.protocols ?? []) {
        if (!protocols.has(id)) add(pat, `Protocol "${id}" does not exist`);
        else if (!medium.protocols?.includes(id)) {
          add(pat, `Protocol "${id}" does not ride on ${medium.id}`);
        }
      }
      if (port.role && !roleAllowed(port.role, medium, item)) {
        add(pat, `Role "${port.role}" does not fit ${medium.id}`);
      }
      for (const cap of port.capabilities ?? []) {
        if (!capabilityAllowed(cap, medium)) {
          add(pat, `Capability "${cap}" does not fit ${medium.id}`);
        }
      }
    }
    // Power ports alone do not admit an item, or every appliance would.
    const connectable = ports.some((port) => {
      return media.get(port.medium)?.family !== 'power';
    });
    if (!item.virtual && !connectable) {
      add(at, 'An item needs a port that is not power, unless it is virtual');
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, catalogue };
};
