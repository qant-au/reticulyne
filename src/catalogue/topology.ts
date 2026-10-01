import type { Port } from 'src/vendor/accurona-core';
import { MEDIA } from './media';
import type { Medium } from './schema';

// Connections attached to ports, and the topology rules of
// docs/catalogue.md ("Topology") checked as warnings. Nothing here ever
// refuses a connection: a diagram in progress may be incomplete.

/** What the topology checks need of an item: its id, name and ports. */
export interface TopologyItem {
  id: string;
  name?: string;
  ports?: Port[];
}

/** What the topology checks need of a connection. */
export interface TopologyConnection {
  id: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
  kind?: string;
}

export interface TopologyWarning {
  message: string;
  /** The connections the warning is about (a whole segment, say). */
  connections: string[];
  /** The items the warning is about. */
  items: string[];
}

const mediaById = (media: Medium[]) => {
  return new Map(
    media.map((m) => {
      return [m.id, m];
    })
  );
};

const listProp = (port: Port, key: string): string[] => {
  const value = port.props?.[key];
  return typeof value === 'string' && value ? value.split(',') : [];
};

/** A port's role, defaulted by its medium's topology as the spec says. */
export const portRole = (port: Port, medium: Medium | undefined): string => {
  const role = port.props?.role;
  if (typeof role === 'string' && role) return role;
  return medium?.topology === 'wireless' ? 'client' : 'device';
};

const hasCapability = (port: Port, capability: string) => {
  return listProp(port, 'capabilities').includes(capability);
};

/**
 * How many connections a port takes: one, except a bus or loop `through`
 * port (two) and a wireless `hub` or `peer` (any number).
 */
export const portCapacity = (port: Port, medium: Medium | undefined) => {
  const role = portRole(port, medium);
  if (role === 'through') return 2;
  if (role === 'hub' || role === 'peer') return Infinity;
  return 1;
};

const endKey = (item: string, port: string) => {
  return `${item}\u0000${port}`;
};

const portUse = (connections: TopologyConnection[]) => {
  const use = new Map<string, TopologyConnection[]>();
  const add = (
    item: string,
    port: string | undefined,
    c: TopologyConnection
  ) => {
    if (port === undefined) return;
    const key = endKey(item, port);
    use.set(key, [...(use.get(key) ?? []), c]);
  };
  connections.forEach((c) => {
    add(c.from, c.fromPort, c);
    add(c.to, c.toPort, c);
  });
  return use;
};

// The id a loop port belongs to: 'loop1-out' and 'loop1-in' are loop1.
const loopOf = (portId: string) => {
  const cut = portId.lastIndexOf('-');
  return cut > 0 ? portId.slice(0, cut) : portId;
};

// Wireless association: a client associates with a hub; a peer with a
// peer or a hub (a mesh). Hub to hub is allowed (a backhaul).
const rolesAssociate = (a: string, b: string) => {
  if (a === 'client') return b === 'hub';
  if (b === 'client') return a === 'hub';
  return true;
};

/**
 * The ports a new connection between two items should use: the first
 * medium both have (power last), and on it the first port on each side
 * with room left, a loop's return first where that loop has left the item.
 * When every shared port is taken it still returns the
 * first pair, so the connection is drawn and the overuse is a warning.
 * Undefined when the items share no medium, or either has no ports.
 */
export const pickPorts = (
  from: TopologyItem,
  to: TopologyItem,
  connections: TopologyConnection[],
  media: Medium[] = MEDIA
): { fromPort: string; toPort: string; kind: string } | undefined => {
  const byId = mediaById(media);
  const fromPorts = (from.ports ?? []).filter((p) => {
    return p.kind;
  });
  const toPorts = (to.ports ?? []).filter((p) => {
    return p.kind;
  });
  const toKinds = new Set(
    toPorts.map((p) => {
      return p.kind!;
    })
  );
  const kinds = [
    ...new Set(
      fromPorts
        .map((p) => {
          return p.kind!;
        })
        .filter((k) => {
          return toKinds.has(k);
        })
    )
  ].sort((a, b) => {
    const power = (k: string) => {
      return byId.get(k)?.family === 'power' ? 1 : 0;
    };
    return power(a) - power(b);
  });
  if (kinds.length === 0) return undefined;

  const use = portUse(connections);
  const free = (item: string, port: Port) => {
    const medium = byId.get(port.kind!);
    const used = use.get(endKey(item, port.id))?.length ?? 0;
    return used < portCapacity(port, medium);
  };
  // A loop's return port, on an item whose out port for that loop is already
  // connected: the connection closing the loop belongs there, not on the
  // next loop's out port.
  const closesLoop = (item: TopologyItem, port: Port) => {
    if (portRole(port, byId.get(port.kind!)) !== 'loop-return') return false;
    const loop = loopOf(port.id);
    return (item.ports ?? []).some((p) => {
      return (
        p.kind !== undefined &&
        loopOf(p.id) === loop &&
        portRole(p, byId.get(p.kind)) === 'loop-out' &&
        (use.get(endKey(item.id, p.id))?.length ?? 0) > 0
      );
    });
  };
  const closingFirst = (item: TopologyItem, ports: Port[]) => {
    return [...ports].sort((x, y) => {
      return Number(closesLoop(item, y)) - Number(closesLoop(item, x));
    });
  };
  for (const kind of kinds) {
    const medium = byId.get(kind);
    const a = closingFirst(
      from,
      fromPorts.filter((p) => {
        return p.kind === kind && free(from.id, p);
      })
    );
    const b = closingFirst(
      to,
      toPorts.filter((p) => {
        return p.kind === kind && free(to.id, p);
      })
    );
    for (const pa of a) {
      const pb = b.find((p) => {
        return (
          medium?.topology !== 'wireless' ||
          rolesAssociate(portRole(pa, medium), portRole(p, medium))
        );
      });
      if (pb) return { fromPort: pa.id, toPort: pb.id, kind };
    }
  }
  // Nothing pairs up: a free port where a side has one, else its first.
  const kind = kinds[0];
  const choose = (item: TopologyItem, ports: Port[]) => {
    const on = ports.filter((p) => {
      return p.kind === kind;
    });
    return (
      on.find((p) => {
        return free(item.id, p);
      }) ?? on[0]
    ).id;
  };
  return {
    fromPort: choose(from, fromPorts),
    toPort: choose(to, toPorts),
    kind
  };
};

interface End {
  item: TopologyItem;
  port: Port;
}

/**
 * The topology rules of docs/catalogue.md checked over a diagram: every
 * connection's ports exist and share a medium, no port has more
 * connections than it takes, a bus segment is a tree with its
 * terminators, end-of-line device and bus power, a loop runs from its
 * panel's loop-out back to the same loop's return, and a wireless client
 * associates only with a hub. A connection without ports is not checked.
 */
export const topologyWarnings = (
  items: TopologyItem[],
  connections: TopologyConnection[],
  media: Medium[] = MEDIA
): TopologyWarning[] => {
  const byId = mediaById(media);
  const itemsById = new Map(
    items.map((i) => {
      return [i.id, i];
    })
  );
  const warnings: TopologyWarning[] = [];
  const warn = (message: string, cs: string[], is: string[]) => {
    warnings.push({ message, connections: cs, items: [...new Set(is)] });
  };
  const nameOf = (item: TopologyItem) => {
    return item.name || 'Untitled';
  };
  const portLabel = (end: End) => {
    return end.port.name
      ? `${nameOf(end.item)}: ${end.port.name}`
      : `${nameOf(end.item)}: port ${end.port.id}`;
  };

  // Resolve each connection's two ends; skip what cannot be checked.
  const resolved: { c: TopologyConnection; a: End; b: End; medium?: Medium }[] =
    [];
  connections.forEach((c) => {
    const fromItem = itemsById.get(c.from);
    const toItem = itemsById.get(c.to);
    if (!fromItem || !toItem) return;
    if (c.fromPort === undefined || c.toPort === undefined) return;
    const findPort = (item: TopologyItem, id: string) => {
      return item.ports?.find((p) => {
        return p.id === id;
      });
    };
    const pa = findPort(fromItem, c.fromPort);
    const pb = findPort(toItem, c.toPort);
    if (!pa || !pb) {
      const missing = !pa
        ? `${nameOf(fromItem)} has no port ${c.fromPort}`
        : `${nameOf(toItem)} has no port ${c.toPort}`;
      warn(missing, [c.id], [c.from, c.to]);
      return;
    }
    if (pa.kind !== pb.kind) {
      warn(
        `${portLabel({ item: fromItem, port: pa })} (${pa.kind ?? 'no medium'}) and ${portLabel({ item: toItem, port: pb })} (${pb.kind ?? 'no medium'}) are on different media`,
        [c.id],
        [c.from, c.to]
      );
      return;
    }
    resolved.push({
      c,
      a: { item: fromItem, port: pa },
      b: { item: toItem, port: pb },
      medium: pa.kind ? byId.get(pa.kind) : undefined
    });
  });

  // Each port takes as many connections as its role allows.
  const use = new Map<string, { end: End; medium?: Medium; cs: string[] }>();
  resolved.forEach(({ c, a, b, medium }) => {
    [a, b].forEach((end) => {
      const key = endKey(end.item.id, end.port.id);
      const entry = use.get(key) ?? { end, medium, cs: [] };
      entry.cs.push(c.id);
      use.set(key, entry);
    });
  });
  use.forEach(({ end, medium, cs }) => {
    const capacity = portCapacity(end.port, medium);
    if (cs.length > capacity) {
      warn(
        `${portLabel(end)} takes ${capacity === 1 ? 'one connection' : `${capacity} connections`}; it has ${cs.length}`,
        cs,
        [end.item.id]
      );
    }
  });

  // Wireless association.
  resolved.forEach(({ c, a, b, medium }) => {
    if (medium?.topology !== 'wireless') return;
    const ra = portRole(a.port, medium);
    const rb = portRole(b.port, medium);
    if (!rolesAssociate(ra, rb)) {
      warn(
        `${portLabel(a)} (${ra}) and ${portLabel(b)} (${rb}) cannot associate: a client associates with a hub`,
        [c.id],
        [a.item.id, b.item.id]
      );
    }
  });

  // Segments: the connections of one medium that touch each other,
  // through the items they join.
  const segmentsOf = (topology: Medium['topology']) => {
    const byMedium = new Map<string, typeof resolved>();
    resolved.forEach((r) => {
      if (r.medium?.topology !== topology) return;
      byMedium.set(r.medium.id, [...(byMedium.get(r.medium.id) ?? []), r]);
    });
    const segments: { medium: Medium; rs: typeof resolved }[] = [];
    byMedium.forEach((rs) => {
      const parent = new Map<string, string>();
      const find = (x: string): string => {
        const p = parent.get(x) ?? x;
        if (p === x) return x;
        const root = find(p);
        parent.set(x, root);
        return root;
      };
      rs.forEach(({ c }) => {
        parent.set(find(c.from), find(c.to));
      });
      const groups = new Map<string, typeof resolved>();
      rs.forEach((r) => {
        const root = find(r.c.from);
        groups.set(root, [...(groups.get(root) ?? []), r]);
      });
      groups.forEach((group) => {
        segments.push({ medium: group[0].medium!, rs: group });
      });
    });
    return segments;
  };

  const ids = (rs: typeof resolved) => {
    return rs.map((r) => {
      return r.c.id;
    });
  };
  const itemIds = (rs: typeof resolved) => {
    return rs.flatMap((r) => {
      return [r.c.from, r.c.to];
    });
  };
  const segmentPorts = (rs: typeof resolved) => {
    const ends = new Map<string, End>();
    rs.forEach(({ a, b }) => {
      ends.set(endKey(a.item.id, a.port.id), a);
      ends.set(endKey(b.item.id, b.port.id), b);
    });
    return [...ends.values()];
  };

  segmentsOf('bus').forEach(({ medium, rs }) => {
    const cs = ids(rs);
    const is = itemIds(rs);
    const nodes = new Set(is);
    const label = `${medium.name} segment`;
    if (rs.length >= nodes.size) {
      warn(`${label} has a cycle; a bus is a chain or a tree`, cs, is);
    }
    const degree = new Map<string, number>();
    rs.forEach(({ c }) => {
      degree.set(c.from, (degree.get(c.from) ?? 0) + 1);
      degree.set(c.to, (degree.get(c.to) ?? 0) + 1);
    });
    const ports = segmentPorts(rs);
    const atEnd = (end: End) => {
      return degree.get(end.item.id) === 1;
    };
    if (medium.termination === 'both-ends') {
      const terminators = ports.filter((e) => {
        return hasCapability(e.port, 'terminator');
      });
      if (terminators.length !== 2) {
        warn(
          `${label} has ${terminators.length} terminator${terminators.length === 1 ? '' : 's'}; it needs one at each end`,
          cs,
          is
        );
      }
      terminators
        .filter((e) => {
          return !atEnd(e);
        })
        .forEach((e) => {
          warn(
            `${portLabel(e)} terminates the ${label} but is not at an end`,
            cs,
            [e.item.id]
          );
        });
    }
    if (medium.termination === 'eol') {
      const eols = ports.filter((e) => {
        return hasCapability(e.port, 'eol');
      });
      if (eols.length !== 1) {
        warn(
          `${label} has ${eols.length} end-of-line devices; it needs one, at the far end`,
          cs,
          is
        );
      }
      eols
        .filter((e) => {
          return !atEnd(e);
        })
        .forEach((e) => {
          warn(
            `${portLabel(e)} is an end-of-line device but is not at an end`,
            cs,
            [e.item.id]
          );
        });
    }
    if (
      medium.busPower &&
      !ports.some((e) => {
        return hasCapability(e.port, 'bus-power');
      })
    ) {
      warn(`${label} has no bus power`, cs, is);
    }
  });

  segmentsOf('loop').forEach(({ medium, rs }) => {
    const cs = ids(rs);
    const is = itemIds(rs);
    const label = `${medium.name}`;
    const starts = segmentPorts(rs).filter((e) => {
      return portRole(e.port, medium) === 'loop-out';
    });
    if (starts.length !== 1) {
      warn(
        starts.length === 0
          ? `${label} does not start at a panel's loop-out`
          : `${label} joins ${starts.length} loop-outs; each loop leaves the panel once`,
        cs,
        is
      );
      return;
    }
    // Walk from the loop-out: arrive at a port, leave by the port's
    // other connection, until the loop returns or breaks.
    const byEnd = new Map<string, typeof resolved>();
    rs.forEach((r) => {
      [r.a, r.b].forEach((e) => {
        const key = endKey(e.item.id, e.port.id);
        byEnd.set(key, [...(byEnd.get(key) ?? []), r]);
      });
    });
    const start = starts[0];
    const visited = new Set<string>();
    let at = start;
    let via: (typeof resolved)[number] | undefined;
    for (;;) {
      const next = (byEnd.get(endKey(at.item.id, at.port.id)) ?? []).find(
        (r) => {
          return r !== via && !visited.has(r.c.id);
        }
      );
      if (!next) {
        warn(
          `${label} from ${portLabel(start)} is open: it does not return to the panel`,
          cs,
          is
        );
        break;
      }
      visited.add(next.c.id);
      via = next;
      const sameEnd =
        next.a.item.id === at.item.id && next.a.port.id === at.port.id;
      at = sameEnd ? next.b : next.a;
      const role = portRole(at.port, medium);
      if (role === 'loop-return') {
        if (
          at.item.id !== start.item.id ||
          loopOf(at.port.id) !== loopOf(start.port.id)
        ) {
          warn(
            `${label} from ${portLabel(start)} returns to ${portLabel(at)}, not to the same loop`,
            cs,
            is
          );
        }
        break;
      }
      if (role !== 'through') {
        warn(
          `${label} from ${portLabel(start)} is open: it ends at ${portLabel(at)}`,
          cs,
          is
        );
        break;
      }
    }
    if (visited.size < rs.length) {
      warn(
        `${label} from ${portLabel(start)} branches; a loop visits each device once`,
        cs,
        is
      );
    }
  });

  return warnings;
};
