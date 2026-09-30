# Catalogue

> **Status: the data, the schema, the palette, port attachment and the topology warnings are built.**
> The registries, the schema and the rules below are in `src/catalogue/` and exported from the
> package (`CATALOGUE`, `validateCatalogue`, `expandPorts`, `itemToSceneObject`,
> `accuronaIcons`, `catalogueItemIcon`, `pickPorts`, `topologyWarnings`). The icon library panel has a **Catalogue** section, one
> fold per medium family (see [The palette](#the-palette)); placing an item creates the object
> described in [How an item lands in a scene](#how-an-item-lands-in-a-scene), and the editor's
> model item carries the object's `element`, `props`, `ports` and `links` so a save writes them
> back. A connector drawn between two items with ports draws a model connection attached to a
> port on each (see [Attaching a connector](#attaching-a-connector)); a node's four "ports" on the
> canvas are still the tile-edge hotspots used for connecting by drag.
>
> An item with an Accurona twin draws with the element's isometric view: `accuronaIcons()`
> returns those drawings as icons (collection `Accurona`, ids `accurona-<element id>`), and
> `catalogueItemIcon(item)` names the one an item uses. Only the drawings of cross-referenced
> elements are vendored (`node scripts/sync-accurona.mjs` picks them from `src/catalogue/items.ts`).
>
> Every built-in item also has a **2D schematic symbol** for the flat, Visio-style view:
> `catalogueItemSymbol(item)` returns it as SVG, and `schematicIcons()` returns them as flat icons
> (collection `Schematic`, ids `schematic-<item id>`). An item with a twin uses the schematic
> Accurona generates from the element's model (`dist/schematic/<id>.svg`, vendored beside the
> isometric drawings); an item with no twin has one drawn in `src/catalogue/symbols.ts`. A view
> of kind `schematic` (the flat view) draws a node whose icon is `accurona-<element id>` with that
> element's schematic; `schematicIconUrl(icon)` is the swap.

The **catalogue** is Reticulyne's list of the things a diagram connects: devices with ports, the
passive parts that make up a bus (tees, terminators, power injectors), and virtual things that
never appear on a floor plan (the internet, a cloud service, a VPN tunnel). It is plain data,
validated by one schema, and a host can extend it the same way it supplies
[isopacks](isopacks.md).

Three registries make up the catalogue:

| Registry | Answers | Example |
|---|---|---|
| **Media** | What can physically be plugged together, and in what shape | `rs-485`, `nmea-2000`, `wi-fi` |
| **Protocols** | What is spoken over a medium | `modbus-rtu` on `rs-485` |
| **Items** | What you drag onto the canvas, and which ports it has | `n2k-tee-4way`, `chartplotter` |

## Relation to Accurona

[Accurona](https://github.com/qant-au/accurona) is the element library shared with Axonometra:
physical things with a real size, a plan view and a 3D model. Accurona elements have **no ports**.
Ports, media and protocols are defined only here.

The two lists overlap (a Wi-Fi access point is both a physical element and a network device), and
an entry that exists in both relates to the other by a free-form cross-reference. Neither schema
depends on it: an Accurona element with no catalogue twin is fine, and so is a catalogue item with
no element. See [Cross-reference to Accurona](#cross-reference-to-accurona).

What the catalogue does **not** hold: dimensions, plan symbols, 3D models, materials. Those belong
to Accurona.

## Media

A **medium** is defined by what you can plug together. Two ports can be joined only if they are on
the same medium.

```ts
type Topology = 'point-to-point' | 'bus' | 'loop' | 'wireless';

type Family =
  | 'ethernet' | 'wireless' | 'serial' | 'marine-vehicle' | 'building'
  | 'security' | 'fire' | 'av' | 'power' | 'virtual';

interface Medium {
  id: string;             // kebab-case, unique
  name: string;
  family: Family;         // palette section, see "The palette"
  topology: Topology;
  basedOn?: string;       // electrical lineage, informational only: nmea-2000 -> 'can'
  connectors: string[];   // connector ids valid on this medium, first is the default
  protocols?: string[];   // protocols that ride on it, see "Protocols"
  termination?: 'both-ends' | 'eol';  // bus media only
  busPower?: boolean;     // the segment needs a power source (bus media only)
}
```

- **A medium is not its electrical layer.** NMEA 2000 and J1939 are CAN electrically, but they use
  their own connectors, cables and wiring rules, so each is a medium with `basedOn: 'can'`. The
  same goes for DMX512 and OSDP on RS-485, and NMEA 0183 on RS-422. `basedOn` never lets two media
  connect; it is there so a reader knows why a gateway between them is cheap.
- **PoE is not a medium.** It is a capability of an Ethernet port (`poe-pse`, `poe-pd`).

### The media

| id | Name | Family | Topology | Based on | Connectors | Protocols | Notes |
|---|---|---|---|---|---|---|---|
| `ethernet-copper` | Ethernet (copper) | ethernet | point-to-point | | `rj45`, `m12-x`, `m12-d`, `terminal` | `ip`, `modbus-tcp`, `bacnet-ip`, `knx-ip`, `dante`, `art-net`, `sacn`, `onvif` | PoE as a port capability |
| `ethernet-fibre` | Ethernet (fibre) | ethernet | point-to-point | | `sfp`, `sfp-plus`, `qsfp`, `lc`, `sc`, `st` | as copper | |
| `wi-fi` | Wi-Fi | wireless | wireless | | `internal`, `rp-sma`, `n-type` | `ip` | |
| `zigbee` | Zigbee | wireless | wireless | | `internal` | `zigbee` | mesh |
| `z-wave` | Z-Wave | wireless | wireless | | `internal` | `z-wave` | mesh |
| `lorawan` | LoRaWAN | wireless | wireless | | `internal`, `sma`, `n-type` | `lorawan` | device to one or more gateways |
| `bluetooth` | Bluetooth | wireless | wireless | | `internal` | `bluetooth` | pairing |
| `cellular` | Cellular | wireless | wireless | | `internal`, `sma`, `n-type`, `sim` | `ip` | |
| `rs-232` | RS-232 | serial | point-to-point | | `db9`, `db25`, `rj45`, `terminal` | `modbus-rtu`, `ascii` | |
| `rs-422` | RS-422 | serial | point-to-point | | `terminal`, `db9`, `rj45` | `modbus-rtu`, `ascii` | one driver, up to ten receivers: model extra receivers as a bus of `rs-485` if you need them |
| `rs-485` | RS-485 | serial | bus | | `terminal`, `rj45`, `db9` | `modbus-rtu`, `bacnet-mstp`, `ascii` | termination both ends |
| `usb` | USB | serial | point-to-point | | `usb-a`, `usb-b`, `usb-c`, `usb-micro-b` | `usb` | |
| `can` | CAN | serial | bus | | `terminal`, `db9`, `m12-a` | `canopen`, `can-raw` | termination both ends |
| `nmea-2000` | NMEA 2000 | marine-vehicle | bus | `can` | `micro-c`, `mini-c` | `nmea-2000` | termination both ends, bus powered |
| `nmea-0183` | NMEA 0183 | marine-vehicle | bus | `rs-422` | `terminal`, `wire` | `nmea-0183` | one talker, several listeners |
| `j1939` | J1939 | marine-vehicle | bus | `can` | `deutsch-dt`, `deutsch-hd10`, `terminal` | `j1939` | termination both ends |
| `knx` | KNX TP | building | bus | | `knx-terminal` | `knx` | free topology without loops, bus powered |
| `dali-2` | DALI-2 | building | bus | | `terminal` | `dali-2` | free topology, polarity free, bus powered |
| `wiegand` | Wiegand | security | point-to-point | | `terminal` | `wiegand` | reader to controller |
| `osdp` | OSDP | security | bus | `rs-485` | `terminal` | `osdp` | multi-drop, termination both ends |
| `dry-contact` | Dry contact / alarm zone | security | bus | | `terminal` | | one or more contacts on a zone, end-of-line resistor |
| `fire-loop` | Fire loop (addressable) | fire | loop | | `terminal` | `fire-addressable` | leaves the panel and returns, panel powered |
| `fire-zone` | Fire zone (conventional) | fire | bus | | `terminal` | | radial circuit, end-of-line device |
| `hdmi` | HDMI | av | point-to-point | | `hdmi-a`, `hdmi-mini`, `hdmi-micro` | `hdmi`, `cec` | |
| `displayport` | DisplayPort | av | point-to-point | | `dp`, `mini-dp`, `usb-c` | `displayport` | |
| `coax` | Coax | av | point-to-point | | `bnc`, `f-type`, `iec-tv`, `sma`, `n-type` | `analog-video`, `hd-tvi`, `hd-cvi`, `ahd`, `dvb-t`, `catv` | |
| `speaker-100v` | 100 V speaker line | av | bus | | `terminal` | | constant-voltage line, speakers in parallel |
| `dmx512` | DMX512 | av | bus | `rs-485` | `xlr-5`, `xlr-3`, `rj45`, `terminal` | `dmx512`, `rdm` | daisy chain, termination at the end |
| `power-ac` | Power (AC) | power | point-to-point | | `iec-c13`, `iec-c14`, `iec-c19`, `iec-c20`, `mains-socket`, `mains-plug`, `terminal` | | |
| `power-dc` | Power (DC) | power | point-to-point | | `barrel`, `terminal`, `anderson`, `wire` | | |
| `ip-tunnel` | IP tunnel | virtual | point-to-point | | `none` | `ipsec`, `wireguard`, `openvpn` | logical, rides on any IP path |

`termination` and `busPower` on the bus media:

| Medium | `termination` | `busPower` |
|---|---|---|
| `rs-485`, `can`, `nmea-2000`, `j1939`, `osdp` | `both-ends` | `nmea-2000` only |
| `dmx512` | `both-ends` (the controller end is terminated inside the controller) | no |
| `knx`, `dali-2` | none | yes |
| `dry-contact`, `fire-zone` | `eol` | no |
| `nmea-0183`, `speaker-100v` | none | no |

## Protocols

```ts
interface Protocol {
  id: string;
  name: string;
  media: string[];   // the media it rides on
}
```

Protocols ride on media. A port lists the protocols it speaks; each must ride on the port's medium.
Examples: `modbus-rtu` on `rs-232`, `rs-422`, `rs-485`; `bacnet-mstp` on `rs-485`; `modbus-tcp`
and `bacnet-ip` on both Ethernet media; `rdm` on `dmx512`; `nmea-2000` on `nmea-2000`; `j1939` on
`j1939`; `canopen` on `can`.

Protocols are descriptive. The editor never refuses a connection because of a protocol mismatch;
it can flag one (a Modbus master and a BACnet device on the same RS-485 segment).

## Items

```ts
interface CatalogueItem {
  id: string;                 // kebab-case, unique in the catalogue
  name: string;
  family: Family;             // palette section, normally the family of its main port
  description?: string;
  icon?: string;              // Reticulyne icon id
  virtual?: boolean;          // never physical, never on a floor plan
  ports: PortTemplate[];
  props?: Record<string, string | number | boolean>;  // defaults copied onto the placed object
  links?: ExternalLink[];     // cross-references, e.g. { source: 'accurona', ref: 'wifi-ap' }
}
```

### Ports: connector + medium + protocol

```ts
interface PortTemplate {
  id: string;                 // 'eth1', or a pattern: 'eth{1..24}' expands to eth1 .. eth24
  name?: string;              // may use {n}: 'Port {n}'
  medium: string;             // Medium id
  connector?: string;         // one of medium.connectors; default the first
  gender?: 'male' | 'female'; // mating hint where it matters (Micro-C, XLR, IEC)
  role?: PortRole;            // default depends on topology, see below
  protocols?: string[];       // each must ride on `medium`
  capabilities?: Capability[];
  props?: Record<string, string | number | boolean>;
}

type PortRole =
  | 'device'                       // an ordinary end on any medium (the default)
  | 'through'                      // one terminal carrying the bus in and out (daisy chain)
  | 'backbone' | 'drop'            // bus infrastructure: tees, terminators, injectors
  | 'loop-out' | 'loop-return'     // a panel's two ends of one loop
  | 'hub' | 'client' | 'peer';     // wireless; 'hub' also on virtual items (see Virtual items)

type Capability =
  | 'poe-pse' | 'poe-pd'           // Ethernet ports only
  | 'power-in' | 'power-out'       // power media only: which way power flows
  | 'bus-power'                    // feeds a busPower segment (injector, KNX PSU, fire panel)
  | 'terminator'                   // terminates a both-ends segment (a terminator, or a device's built-in switch)
  | 'eol'                          // end-of-line device on an eol segment
  | 'isolator';                    // fire loop short-circuit isolator
```

Rules the catalogue schema checks:

- Every `medium`, `connector` and `protocol` referenced exists, the connector belongs to the
  medium, and the protocol rides on it.
- Port ids are unique within an item after pattern expansion.
- `poe-*` only on Ethernet media, `power-in`/`power-out` only on power media, `terminator` and
  `eol` only on bus media with the matching `termination`.
- **An item needs at least one port that is not on a power medium, unless it is virtual.** Power
  ports alone do not admit an item: otherwise every kettle and fridge in Accurona becomes a
  palette entry. A UPS or a PDU qualifies because it has a network or serial port; a plain power
  board does not.

## Topology

A **connection** always joins exactly two ports: it is a cable, a direct mate (a terminator
pushed into a tee), or, on wireless media, an association. A bus is therefore not one connection
with many ends. It is the set of connections of one medium that touch each other, called a
**segment**, and the topology of the medium is a rule about the shape of that segment.

The editor reports broken rules as warnings. It never refuses to draw: a diagram in progress is
allowed to be incomplete.

### Attaching a connector

Drawing a connector between two items that both have ports creates the connection it draws
(the connector's `connection`). `pickPorts` chooses the ports: the first medium both items have,
power last, and on it the first port on each side with room left (a wireless client pairs with a
hub). When every shared port is taken it still attaches, to a free port where a side has one, and
the overuse is a warning. Items with no medium in common get a connector and no connection. The
connector's inspector shows the two ports and lets either be changed; the medium follows the port.
Moving an end to another item lets go of the connection and attaches afresh, and deleting the last
connector that draws a connection deletes it.

`topologyWarnings(items, connections)` checks the rules below and returns each broken one with
the connections and items it is about. The inspector lists the warnings about the selected
connector or object under **Topology**. A connection without ports (drawn by an earlier version, or
between items with no ports) is not checked.

### Point-to-point

Each port takes one connection. Ethernet, RS-232, RS-422, USB, Wiegand, HDMI, DisplayPort, coax,
power and IP tunnels.

A switch, a patch panel or a power board is just an item with many point-to-point ports.

### Bus

Many devices share one segment. Default port role is `device` (one connection).

- `through` ports take two connections: the in and out wires landing on one terminal, as on an
  RS-485 device, a KNX actuator or a DALI driver. A device with separate in and thru sockets (DMX
  in and thru) has two ports instead.
- `backbone` ports belong to bus infrastructure and take one connection each. A tee has two, a
  terminator one.
- `drop` ports are the device side of a tee and take one connection, to a `device` port.
- A segment must be a chain or tree with **no cycles**.
- `termination: 'both-ends'`: the segment has exactly two ports with `terminator`, at its two ends.
- `termination: 'eol'`: exactly one `eol` port, at the far end from the panel.
- `busPower: true`: at least one port with `bus-power` on the segment.

Bus infrastructure is **catalogue items**, not a special case: tees, multi-port tees, terminators,
power injectors, end-of-line resistors. Cables are **connections**, not items; a connection can
carry its length in `props.length` (millimetres, like every length in the scene format).

### Loop

The addressable fire loop. The panel has a `loop-out` and a `loop-return` port per loop; each
device on the loop has a `through` port. The segment must be one path from `loop-out` to the
`loop-return` of the same loop, visiting each device once. A break anywhere still leaves every
device reachable from one end, which is the point of a loop. Devices with a built-in isolator
carry `isolator`; a stand-alone isolator module is an item.

### Wireless

No cable. A wireless port belongs to a named network through `props.network` (an SSID, a Zigbee
PAN, a LoRaWAN network, a carrier), and membership is enough: no connection has to be drawn.

A drawn connection means **association**:

- `hub` (access point, coordinator, gateway, base station) takes any number of connections.
- `client` takes one per network.
- `peer` (Zigbee router, Z-Wave node, Bluetooth device) may connect to any other `peer` or `hub`,
  which is how a mesh is drawn.

## Gateways need no special case

A gateway is an item with ports on two media. An RS-485 to Ethernet bridge for a fire panel's
high-level interface is:

```json
{
  "id": "rs485-ethernet-gateway",
  "name": "RS-485 to Ethernet gateway",
  "family": "serial",
  "ports": [
    { "id": "rs485", "medium": "rs-485", "role": "through", "protocols": ["modbus-rtu"] },
    { "id": "eth1", "medium": "ethernet-copper", "protocols": ["modbus-tcp"] },
    { "id": "dc-in", "medium": "power-dc", "capabilities": ["power-in"] }
  ]
}
```

An engine gateway (J1939 to NMEA 2000) and a KNX IP router are the same shape.

## Virtual items

Virtual items are things a network diagram needs that have no physical form: the internet, a
cloud service, a SaaS application, a VPN tunnel, a VLAN. They carry `virtual: true`, are never
placed on a floor plan, and have no Accurona twin. They are exempt from the power-port rule and
may have no ports at all (an item with no ports can still be the end of a connector drawn to the
object rather than to a port).

```json
[
{ "id": "internet", "name": "Internet", "family": "virtual", "virtual": true,
  "ports": [ { "id": "wan{1..8}", "medium": "ethernet-copper", "role": "hub" } ] },

{ "id": "vpn-tunnel", "name": "VPN tunnel", "family": "virtual", "virtual": true,
  "ports": [ { "id": "a", "medium": "ip-tunnel", "protocols": ["wireguard"] },
             { "id": "b", "medium": "ip-tunnel", "protocols": ["wireguard"] } ] },

{ "id": "cloud-service", "name": "Cloud service", "family": "virtual", "virtual": true,
  "ports": [ { "id": "tunnel", "medium": "ip-tunnel" }, { "id": "public", "medium": "ethernet-copper" } ] }
]
```

The `internet` item's ports are `hub` ports on Ethernet so a router's WAN port can connect to it
without a special medium; the role lifts the one-connection limit.

## Cross-reference to Accurona

An item that has a physical twin names it with an external link:

```json
{ "id": "wifi-ap-ceiling", "name": "Wi-Fi access point", "family": "wireless",
  "links": [ { "source": "accurona", "ref": "wifi-ap" } ],
  "ports": [
    { "id": "eth1", "medium": "ethernet-copper", "capabilities": ["poe-pd"] },
    { "id": "radio", "medium": "wi-fi", "role": "hub" }
  ] }
```

- The link is the scene format's `ExternalLink { source, ref }`. It is optional and **not
  validated**: an unknown element id is not an error.
- An item with a twin can borrow the element's isometric drawing instead of having its own icon,
  and uses the element's generated 2D schematic as its symbol in the flat view.
- First twins worth adding: `wifi-ap`, `network-switch`, `router`, `firewall`, `nas`, `ip-phone`,
  `cctv-dome`, `cctv-bullet`, `cctv-ptz`, `nvr`, `alarm-panel`, `card-reader`, `pir-sensor`,
  `door-contact`, `intercom`, `fire-panel`, `smoke-detector`, `heat-detector`,
  `manual-call-point`.

## How an item lands in a scene

The scene format does not change. Placing an item creates a scene object that stands on its own,
so a scene opens and renders correctly without the catalogue that made it:

- The item's ports are expanded and **copied** onto the object's `ports`. Each port's `kind` is
  the medium id. Its connector, gender, role, protocols and capabilities go in the port's `props`
  (lists as comma-separated strings, because props hold scalars only).
- The item is recorded as `links: [{ source: 'reticulyne', ref: '<item id>' }]`.
- If the item has an Accurona cross-reference, the object's `element` is set to that element id.
  That is what lets the same object appear on an Axonometra floor plan: one object, two views.
- The item's `props` are copied as the object's starting props.
- A connection's `kind` is the medium id; `fromPort` and `toPort` name the two ports. Topology is
  checked by the editor, never by the scene schema.

## The palette

The palette is arranged by **medium family**, never by Accurona group:

1. Ethernet and IP
2. Wireless
3. Serial and field bus
4. Marine and vehicle
5. Building control
6. Security and access
7. Fire
8. AV
9. Power
10. Virtual

An item appears under its own `family`. Search covers every item regardless of section.

## Worked examples

Scene excerpts below show only `objects` and `connections`; views and placements are omitted.
Ports are shown after expansion.

### PoE switch and camera

```json
{
  "objects": [
    { "id": "sw1", "name": "Switch", "element": "network-switch",
      "links": [ { "source": "reticulyne", "ref": "poe-switch-8" } ],
      "ports": [ { "id": "eth1", "kind": "ethernet-copper",
                   "props": { "connector": "rj45", "capabilities": "poe-pse" } } ] },
    { "id": "cam1", "name": "Front door camera", "element": "cctv-dome",
      "links": [ { "source": "reticulyne", "ref": "ip-camera-dome" } ],
      "ports": [ { "id": "eth1", "kind": "ethernet-copper",
                   "props": { "connector": "rj45", "capabilities": "poe-pd", "protocols": "onvif" } } ] }
  ],
  "connections": [
    { "id": "c1", "from": "sw1", "fromPort": "eth1", "to": "cam1", "toPort": "eth1",
      "kind": "ethernet-copper", "props": { "poe": true, "length": 25000 } }
  ]
}
```

### NMEA 2000: a 4-way tee with a chartplotter, radar, power injector and GPS

The common small-boat network: one multi-port tee, a terminator on each end of it, and a device
on each of its four drops. The power injector sits on a drop and feeds the whole bus.

Catalogue items used:

```json
[
  { "id": "n2k-tee-4way", "name": "NMEA 2000 4-way tee", "family": "marine-vehicle",
    "ports": [
      { "id": "in",  "name": "Backbone in",  "medium": "nmea-2000", "gender": "female", "role": "backbone" },
      { "id": "out", "name": "Backbone out", "medium": "nmea-2000", "gender": "male",   "role": "backbone" },
      { "id": "drop{1..4}", "name": "Drop {n}", "medium": "nmea-2000", "gender": "female", "role": "drop" }
    ] },
  { "id": "n2k-tee", "name": "NMEA 2000 tee", "family": "marine-vehicle",
    "ports": [
      { "id": "in",   "medium": "nmea-2000", "gender": "female", "role": "backbone" },
      { "id": "out",  "medium": "nmea-2000", "gender": "male",   "role": "backbone" },
      { "id": "drop", "medium": "nmea-2000", "gender": "female", "role": "drop" }
    ] },
  { "id": "n2k-terminator-male", "name": "NMEA 2000 terminator (male)", "family": "marine-vehicle",
    "ports": [ { "id": "t", "medium": "nmea-2000", "gender": "male", "role": "backbone", "capabilities": ["terminator"] } ] },
  { "id": "n2k-terminator-female", "name": "NMEA 2000 terminator (female)", "family": "marine-vehicle",
    "ports": [ { "id": "t", "medium": "nmea-2000", "gender": "female", "role": "backbone", "capabilities": ["terminator"] } ] },
  { "id": "n2k-power-injector", "name": "NMEA 2000 power injector", "family": "marine-vehicle",
    "ports": [
      { "id": "n2k",   "medium": "nmea-2000", "gender": "male", "capabilities": ["bus-power"] },
      { "id": "dc-in", "medium": "power-dc", "connector": "wire", "capabilities": ["power-in"] }
    ] },
  { "id": "chartplotter", "name": "Chartplotter", "family": "marine-vehicle",
    "ports": [
      { "id": "n2k",  "medium": "nmea-2000", "gender": "male", "protocols": ["nmea-2000"], "props": { "len": 1 } },
      { "id": "eth1", "medium": "ethernet-copper", "name": "Marine network" },
      { "id": "0183", "medium": "nmea-0183", "role": "through", "protocols": ["nmea-0183"] },
      { "id": "dc-in", "medium": "power-dc", "capabilities": ["power-in"] }
    ] },
  { "id": "marine-radar", "name": "Radar", "family": "marine-vehicle",
    "ports": [
      { "id": "n2k",  "medium": "nmea-2000", "gender": "male", "protocols": ["nmea-2000"], "props": { "len": 1 } },
      { "id": "eth1", "medium": "ethernet-copper", "name": "Marine network" },
      { "id": "dc-in", "medium": "power-dc", "capabilities": ["power-in"] }
    ] },
  { "id": "gps-receiver", "name": "GPS receiver", "family": "marine-vehicle",
    "ports": [ { "id": "n2k", "medium": "nmea-2000", "gender": "male", "protocols": ["nmea-2000"], "props": { "len": 1 } } ] }
]
```

The GPS receiver has no power port: it is powered from the bus, which is the normal case for a
small NMEA 2000 sensor. `len` is the device's Load Equivalency Number (1 LEN = 50 mA drawn from
the bus); the editor can sum it against what the injector supplies.

The scene (port props omitted for brevity):

```json
{
  "objects": [
    { "id": "tee",   "name": "4-way tee",        "links": [ { "source": "reticulyne", "ref": "n2k-tee-4way" } ] },
    { "id": "term1", "name": "Terminator",       "links": [ { "source": "reticulyne", "ref": "n2k-terminator-male" } ] },
    { "id": "term2", "name": "Terminator",       "links": [ { "source": "reticulyne", "ref": "n2k-terminator-female" } ] },
    { "id": "mfd",   "name": "Chartplotter",     "links": [ { "source": "reticulyne", "ref": "chartplotter" } ] },
    { "id": "radar", "name": "Radar",            "links": [ { "source": "reticulyne", "ref": "marine-radar" } ] },
    { "id": "pwr",   "name": "Power injector",   "links": [ { "source": "reticulyne", "ref": "n2k-power-injector" } ] },
    { "id": "gps",   "name": "GPS",              "links": [ { "source": "reticulyne", "ref": "gps-receiver" } ] }
  ],
  "connections": [
    { "id": "b1", "from": "term1", "fromPort": "t",     "to": "tee",   "toPort": "in",  "kind": "nmea-2000" },
    { "id": "b2", "from": "tee",   "fromPort": "out",   "to": "term2", "toPort": "t",   "kind": "nmea-2000" },
    { "id": "d1", "from": "tee",   "fromPort": "drop1", "to": "mfd",   "toPort": "n2k", "kind": "nmea-2000", "props": { "length": 2000 } },
    { "id": "d2", "from": "tee",   "fromPort": "drop2", "to": "radar", "toPort": "n2k", "kind": "nmea-2000", "props": { "length": 6000 } },
    { "id": "d3", "from": "tee",   "fromPort": "drop3", "to": "pwr",   "toPort": "n2k", "kind": "nmea-2000", "props": { "length": 1000 } },
    { "id": "d4", "from": "tee",   "fromPort": "drop4", "to": "gps",   "toPort": "n2k", "kind": "nmea-2000", "props": { "length": 4000 } },
    { "id": "e1", "from": "mfd",   "fromPort": "eth1",  "to": "radar", "toPort": "eth1", "kind": "ethernet-copper" }
  ]
}
```

Checked against the bus rules:

- The `nmea-2000` segment is `b1`, `b2` and `d1`..`d4`: a tree with no cycle.
- Exactly two `terminator` ports (`term1.t`, `term2.t`), at the two ends of the backbone.
- One `bus-power` port (`pwr.n2k`), so the `busPower` rule holds.
- Every drop joins a `drop` port to a `device` port, each port used once.
- `b1` and `b2` are direct mates, so they carry no length. The drops carry theirs.
- `e1` is a separate point-to-point Ethernet connection, the radar's image feed to the plotter.
- The power ports (`mfd.dc-in`, `radar.dc-in`, `pwr.dc-in`) are left unconnected, which is
  allowed; draw a battery or a DC panel and connect them if the diagram needs it.

### Extending the backbone: an engine gateway

Adding an engine means lengthening the backbone. Move `term2` off the 4-way tee, put a backbone
cable and a single tee in its place, and terminate after that:

The gateway item:

```json
{ "id": "engine-gateway", "name": "Engine gateway (J1939 to NMEA 2000)", "family": "marine-vehicle",
  "ports": [
    { "id": "n2k",   "medium": "nmea-2000", "gender": "male", "protocols": ["nmea-2000"] },
    { "id": "j1939", "medium": "j1939", "connector": "deutsch-dt", "protocols": ["j1939"], "capabilities": ["terminator"] }
  ] }
```

The scene changes:

```json
{
  "objects": [
    { "id": "tee2", "name": "Tee", "links": [ { "source": "reticulyne", "ref": "n2k-tee" } ] },
    { "id": "egw",  "name": "Engine gateway", "links": [ { "source": "reticulyne", "ref": "engine-gateway" } ],
      "ports": [ { "id": "n2k", "kind": "nmea-2000" },
                 { "id": "j1939", "kind": "j1939", "props": { "capabilities": "terminator" } } ] },
    { "id": "ecu",  "name": "Engine ECU",
      "ports": [ { "id": "j1939", "kind": "j1939", "props": { "capabilities": "terminator" } } ] }
  ],
  "connections": [
    { "id": "b2", "from": "tee",  "fromPort": "out",  "to": "tee2",  "toPort": "in",  "kind": "nmea-2000", "props": { "length": 5000 } },
    { "id": "b3", "from": "tee2", "fromPort": "out",  "to": "term2", "toPort": "t",   "kind": "nmea-2000" },
    { "id": "d5", "from": "tee2", "fromPort": "drop", "to": "egw",   "toPort": "n2k", "kind": "nmea-2000" },
    { "id": "j1", "from": "egw",  "fromPort": "j1939", "to": "ecu",  "toPort": "j1939", "kind": "j1939" }
  ]
}
```

`b2` is now a backbone cable with a length. The J1939 side is its own segment on its own medium,
terminated at the gateway and at the ECU; the gateway is simply an item with a port on each.

### Addressable fire loop with a high-level interface

```json
{
  "objects": [
    { "id": "fip", "name": "Fire panel", "element": "fire-panel",
      "ports": [
        { "id": "loop1-out", "kind": "fire-loop", "props": { "role": "loop-out", "capabilities": "bus-power" } },
        { "id": "loop1-in",  "kind": "fire-loop", "props": { "role": "loop-return" } },
        { "id": "hli",       "kind": "rs-485",    "props": { "role": "through", "protocols": "modbus-rtu", "capabilities": "terminator" } }
      ] },
    { "id": "sd1", "name": "Smoke detector 1", "element": "smoke-detector",
      "ports": [ { "id": "loop", "kind": "fire-loop", "props": { "role": "through", "capabilities": "isolator" } } ] },
    { "id": "mcp1", "name": "Manual call point", "element": "manual-call-point",
      "ports": [ { "id": "loop", "kind": "fire-loop", "props": { "role": "through" } } ] },
    { "id": "gw", "name": "RS-485 to Ethernet gateway",
      "links": [ { "source": "reticulyne", "ref": "rs485-ethernet-gateway" } ],
      "ports": [ { "id": "rs485", "kind": "rs-485", "props": { "role": "through", "capabilities": "terminator" } },
                 { "id": "eth1",  "kind": "ethernet-copper" } ] }
  ],
  "connections": [
    { "id": "l1", "from": "fip",  "fromPort": "loop1-out", "to": "sd1",  "toPort": "loop",     "kind": "fire-loop" },
    { "id": "l2", "from": "sd1",  "fromPort": "loop",      "to": "mcp1", "toPort": "loop",     "kind": "fire-loop" },
    { "id": "l3", "from": "mcp1", "fromPort": "loop",      "to": "fip",  "toPort": "loop1-in", "kind": "fire-loop" },
    { "id": "h1", "from": "fip",  "fromPort": "hli",       "to": "gw",   "toPort": "rs485",    "kind": "rs-485" }
  ]
}
```

The loop is one path from `loop1-out` back to `loop1-in` through each device once. The RS-485
segment is two devices, each terminated at its own end.

### Cloud service over a VPN

```json
{
  "objects": [
    { "id": "fw",  "name": "Firewall", "element": "firewall",
      "ports": [ { "id": "wan", "kind": "ethernet-copper" }, { "id": "vpn", "kind": "ip-tunnel" } ] },
    { "id": "net", "name": "Internet", "links": [ { "source": "reticulyne", "ref": "internet" } ],
      "ports": [ { "id": "wan1", "kind": "ethernet-copper", "props": { "role": "hub" } } ] },
    { "id": "tun", "name": "Site-to-cloud VPN", "links": [ { "source": "reticulyne", "ref": "vpn-tunnel" } ],
      "ports": [ { "id": "a", "kind": "ip-tunnel" }, { "id": "b", "kind": "ip-tunnel" } ] },
    { "id": "svc", "name": "Monitoring service", "links": [ { "source": "reticulyne", "ref": "cloud-service" } ],
      "ports": [ { "id": "tunnel", "kind": "ip-tunnel" } ] }
  ],
  "connections": [
    { "id": "w1", "from": "fw",  "fromPort": "wan", "to": "net", "toPort": "wan1",   "kind": "ethernet-copper" },
    { "id": "v1", "from": "fw",  "fromPort": "vpn", "to": "tun", "toPort": "a",      "kind": "ip-tunnel" },
    { "id": "v2", "from": "tun", "fromPort": "b",   "to": "svc", "toPort": "tunnel", "kind": "ip-tunnel" }
  ]
}
```

None of `net`, `tun` or `svc` has an `element`: they never appear on a floor plan.

## Best practice

- **Pick the medium by the plug, not the protocol.** If two things cannot be plugged together
  without an adapter or a gateway, they are on different media.
- **Model the passive parts.** Tees, terminators and injectors are what make a bus diagram useful
  for installation and fault-finding, and they are what the topology checks read.
- **Keep cables as connections.** Put the length on the connection in millimetres; do not add a
  cable item.
- **Use `props.network` on wireless ports** rather than drawing an association to every client.
- **Cross-reference, do not copy.** If Accurona has the physical element, link to it and borrow
  its drawing instead of adding a second icon.
