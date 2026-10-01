import { ITEMS } from '../items';
import { itemToSceneObject } from '../place';
import {
  pickPorts,
  topologyWarnings,
  type TopologyConnection,
  type TopologyItem
} from '../topology';

const place = (itemId: string, id: string): TopologyItem => {
  const item = ITEMS.find((i) => {
    return i.id === itemId;
  });
  if (!item) throw new Error(`no item ${itemId}`);
  return itemToSceneObject(item, id);
};

const conn = (
  id: string,
  from: string,
  fromPort: string,
  to: string,
  toPort: string,
  kind?: string
): TopologyConnection => {
  return { id, from, fromPort, to, toPort, ...(kind ? { kind } : {}) };
};

const messages = (items: TopologyItem[], connections: TopologyConnection[]) => {
  return topologyWarnings(items, connections).map((w) => {
    return w.message;
  });
};

describe('pickPorts', () => {
  const sw = place('poe-switch-8', 'sw');
  const cam = place('ip-camera-dome', 'cam');

  test('attaches to the first free port on the shared medium, power last', () => {
    expect(pickPorts(sw, cam, [])).toEqual({
      fromPort: 'eth1',
      toPort: expect.any(String),
      kind: 'ethernet-copper'
    });
  });

  test('skips a port that is already taken', () => {
    const cam2 = place('ip-camera-dome', 'cam2');
    const first = pickPorts(sw, cam, [])!;
    const taken = [conn('c1', 'sw', first.fromPort, 'cam', first.toPort)];
    expect(pickPorts(sw, cam2, taken)?.fromPort).toBe('eth2');
  });

  test('still attaches when every shared port is taken, for a warning', () => {
    const ap = place('wifi-ap-ceiling', 'ap');
    const taken = [conn('c1', 'sw', 'eth1', 'ap', 'eth1')];
    const again = pickPorts(sw, ap, taken);
    expect(again?.toPort).toBe('eth1');
    expect(
      messages(
        [sw, ap],
        [...taken, conn('c2', 'sw', again!.fromPort, 'ap', 'eth1')]
      )
    ).toEqual(['Wi-Fi access point: port eth1 takes one connection; it has 2']);
  });

  test('associates a wireless client with a hub, not another client', () => {
    const ap = place('wifi-ap-ceiling', 'ap');
    const laptop = place('laptop', 'lt');
    expect(pickPorts(laptop, ap, [])).toEqual({
      fromPort: 'wifi',
      toPort: 'radio',
      kind: 'wi-fi'
    });
  });

  test('is undefined when the items share no medium', () => {
    const term = place('n2k-terminator-male', 't');
    expect(pickPorts(sw, term, [])).toBeUndefined();
  });

  test('closes a fire loop on the return of the loop it left by', () => {
    const fip = place('fire-panel-2-loop', 'fip');
    const sd = place('smoke-detector', 'sd');
    const mcp = place('manual-call-point', 'mcp');
    expect(pickPorts(fip, sd, [])?.fromPort).toBe('loop1-out');
    const taken = [
      conn('l1', 'fip', 'loop1-out', 'sd', 'loop', 'fire-loop'),
      conn('l2', 'sd', 'loop', 'mcp', 'loop', 'fire-loop')
    ];
    const back = pickPorts(mcp, fip, taken);
    expect(back?.toPort).toBe('loop1-in');
    expect(
      messages(
        [fip, sd, mcp],
        [...taken, conn('l3', 'mcp', 'loop', 'fip', back!.toPort, 'fire-loop')]
      )
    ).toEqual([]);
  });
});

describe('topologyWarnings', () => {
  test('a port that is not on the item, or ports on different media', () => {
    const sw = place('poe-switch-8', 'sw');
    const cam = place('ip-camera-dome', 'cam');
    expect(
      messages([sw, cam], [conn('c1', 'sw', 'eth99', 'cam', 'eth1')])
    ).toEqual([expect.stringMatching(/has no port eth99/)]);
    expect(
      messages(
        [sw, cam],
        [conn('c1', 'sw', 'uplink1', 'cam', cam.ports![0].id)]
      )
    ).toEqual([expect.stringMatching(/are on different media/)]);
  });

  test('a connection without ports is not checked', () => {
    const sw = place('poe-switch-8', 'sw');
    const cam = place('ip-camera-dome', 'cam');
    expect(messages([sw, cam], [{ id: 'c1', from: 'sw', to: 'cam' }])).toEqual(
      []
    );
  });

  describe('NMEA 2000 bus', () => {
    const items = [
      place('n2k-terminator-male', 't1'),
      place('n2k-tee-4way', 'tee'),
      place('n2k-terminator-female', 't2'),
      place('chartplotter', 'mfd'),
      place('n2k-power-injector', 'pwr')
    ];
    const backbone = [
      conn('b1', 't1', 't', 'tee', 'in'),
      conn('b2', 'tee', 'out', 't2', 't'),
      conn('d1', 'tee', 'drop1', 'mfd', 'n2k'),
      conn('d2', 'tee', 'drop2', 'pwr', 'n2k')
    ];

    test('a terminated, powered backbone is clean', () => {
      expect(messages(items, backbone)).toEqual([]);
    });

    test('a missing terminator and missing power are warned', () => {
      expect(messages(items, backbone.slice(0, 1).concat(backbone[2]))).toEqual(
        [
          'NMEA 2000 segment has 1 terminator; it needs one at each end',
          'NMEA 2000 segment has no bus power'
        ]
      );
    });

    test('a cycle is warned', () => {
      const tee2 = place('n2k-tee', 'tee2');
      const cyclic = [
        ...backbone,
        conn('x1', 'tee', 'drop3', 'tee2', 'in'),
        conn('x2', 'tee2', 'out', 'tee', 'drop4')
      ];
      expect(messages([...items, tee2], cyclic)).toContain(
        'NMEA 2000 segment has a cycle; a bus is a chain or a tree'
      );
    });

    test('a drop takes one connection', () => {
      const gps = place('chartplotter', 'gps');
      expect(
        messages(
          [...items, gps],
          [...backbone, conn('d3', 'tee', 'drop1', 'gps', 'n2k')]
        )
      ).toEqual([
        expect.stringMatching(/drop1?.*takes one connection; it has 2/i)
      ]);
    });
  });

  describe('fire loop', () => {
    const items = [
      place('fire-panel-2-loop', 'fip'),
      place('smoke-detector', 'sd'),
      place('manual-call-point', 'mcp')
    ];

    test('a loop back to the same loop is clean', () => {
      expect(
        messages(items, [
          conn('l1', 'fip', 'loop1-out', 'sd', 'loop'),
          conn('l2', 'sd', 'loop', 'mcp', 'loop'),
          conn('l3', 'mcp', 'loop', 'fip', 'loop1-in')
        ])
      ).toEqual([]);
    });

    test('an open loop is warned', () => {
      expect(
        messages(items, [
          conn('l1', 'fip', 'loop1-out', 'sd', 'loop'),
          conn('l2', 'sd', 'loop', 'mcp', 'loop')
        ])
      ).toEqual([expect.stringMatching(/is open: it does not return/)]);
    });

    test('a return to another loop is warned', () => {
      expect(
        messages(items, [
          conn('l1', 'fip', 'loop1-out', 'sd', 'loop'),
          conn('l2', 'sd', 'loop', 'mcp', 'loop'),
          conn('l3', 'mcp', 'loop', 'fip', 'loop2-in')
        ])
      ).toEqual([expect.stringMatching(/not to the same loop/)]);
    });
  });

  test('a wireless client associated with a client is warned', () => {
    const a = place('laptop', 'a');
    const b = place('laptop', 'b');
    expect(messages([a, b], [conn('w1', 'a', 'wifi', 'b', 'wifi')])).toEqual([
      expect.stringMatching(/cannot associate/)
    ]);
  });
});
