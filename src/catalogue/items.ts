import type { CatalogueItem } from './schema';

// The seed items: the network, AV, security and fire devices that have a
// built-in drawing, the bus infrastructure and devices of the worked
// examples in docs/catalogue.md, and virtual items.
//
// `drawing` names the item's drawing in src/icons/drawings.ts, which gives
// it an isometric icon and a flat schematic. Every built-in item has one.

const acIn = {
  id: 'ac-in',
  name: 'Mains in',
  medium: 'power-ac',
  capabilities: ['power-in' as const]
};
const dcIn = {
  id: 'dc-in',
  name: 'DC in',
  medium: 'power-dc',
  capabilities: ['power-in' as const]
};
// A device powered over its one Ethernet port.
const poeIn = {
  id: 'eth1',
  medium: 'ethernet-copper',
  capabilities: ['poe-pd' as const]
};
// An NMEA 2000 drop: a bus-powered device on a tee.
const n2k = {
  id: 'n2k',
  medium: 'nmea-2000',
  gender: 'male' as const,
  protocols: ['nmea-2000']
};
const modbus = {
  id: 'rs485',
  name: 'RS-485',
  medium: 'rs-485',
  role: 'through' as const,
  protocols: ['modbus-rtu']
};
const bmsIp = {
  id: 'eth1',
  name: 'BMS (IP)',
  medium: 'ethernet-copper',
  protocols: ['bacnet-ip', 'modbus-tcp']
};
const bms485 = {
  id: 'bms',
  name: 'BMS (RS-485)',
  medium: 'rs-485',
  role: 'through' as const,
  protocols: ['modbus-rtu', 'bacnet-mstp']
};
// A rack or tower server: two LAN ports, a management port, mains.
const serverPorts = (): CatalogueItem['ports'] => {
  return [
    { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
    { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
    { ...acIn, connector: 'iec-c14' }
  ];
};

export const ITEMS: CatalogueItem[] = [
  // --- Ethernet and IP ------------------------------------------------
  {
    id: 'network-switch-24',
    name: 'Network Switch (24-Port)',
    family: 'ethernet',
    drawing: 'network-switch',
    ports: [
      { id: 'eth{1..24}', name: 'Port {n}', medium: 'ethernet-copper' },
      { id: 'sfp{1..4}', name: 'SFP {n}', medium: 'ethernet-fibre' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'poe-switch-8',
    name: 'PoE Switch (8-Port)',
    family: 'ethernet',
    drawing: 'network-switch',
    ports: [
      {
        id: 'eth{1..8}',
        name: 'PoE port {n}',
        medium: 'ethernet-copper',
        capabilities: ['poe-pse']
      },
      { id: 'uplink{1..2}', name: 'Uplink {n}', medium: 'ethernet-fibre' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'router',
    name: 'Router',
    family: 'ethernet',
    drawing: 'router',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'firewall',
    name: 'Firewall',
    family: 'ethernet',
    drawing: 'firewall',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'vpn', name: 'VPN', medium: 'ip-tunnel' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'nbn-modem',
    name: 'NBN Modem',
    family: 'ethernet',
    drawing: 'modem-nbn',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'nas',
    name: 'NAS',
    family: 'ethernet',
    drawing: 'nas',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-a' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'server',
    name: 'Server',
    family: 'ethernet',
    drawing: 'server-tower',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'desktop-pc',
    name: 'Desktop PC',
    family: 'ethernet',
    drawing: 'pc-tower',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'dp', name: 'DisplayPort out', medium: 'displayport' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'laptop',
    name: 'Laptop',
    family: 'wireless',
    drawing: 'laptop',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'usb-c', name: 'USB-C', medium: 'usb', connector: 'usb-c' }
    ]
  },
  {
    id: 'ip-phone',
    name: 'IP Phone',
    family: 'ethernet',
    drawing: 'ip-phone',
    ports: [
      {
        id: 'lan',
        name: 'LAN',
        medium: 'ethernet-copper',
        capabilities: ['poe-pd']
      },
      { id: 'pc', name: 'PC', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'data-outlet',
    name: 'Data Outlet',
    family: 'ethernet',
    drawing: 'data-outlet',
    ports: [
      { id: 'jack', name: 'Jack', medium: 'ethernet-copper' },
      {
        id: 'cable',
        name: 'Horizontal cable',
        medium: 'ethernet-copper',
        connector: 'terminal'
      }
    ]
  },
  {
    id: 'floor-box',
    name: 'Floor Box',
    family: 'ethernet',
    drawing: 'floor-box',
    ports: [
      { id: 'data{1..2}', name: 'Data {n}', medium: 'ethernet-copper' },
      {
        id: 'cable{1..2}',
        name: 'Horizontal cable {n}',
        medium: 'ethernet-copper',
        connector: 'terminal'
      },
      {
        id: 'gpo{1..2}',
        name: 'Power outlet {n}',
        medium: 'power-ac',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'fibre-termination-cabinet',
    name: 'Fibre Termination Cabinet',
    family: 'ethernet',
    drawing: 'odf-panel',
    ports: [
      {
        id: 'front{1..24}',
        name: 'Front {n}',
        medium: 'ethernet-fibre',
        connector: 'lc'
      },
      {
        id: 'trunk{1..24}',
        name: 'Trunk {n}',
        medium: 'ethernet-fibre',
        connector: 'lc'
      }
    ]
  },
  {
    id: 'switch-rack-48',
    name: 'Rack Switch (48-Port)',
    family: 'ethernet',
    drawing: 'switch-rack-48',
    ports: [
      { id: 'eth{1..48}', name: 'Port {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..4}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'core-switch-chassis',
    name: 'Core Switch (Chassis)',
    family: 'ethernet',
    drawing: 'core-switch-chassis',
    ports: [
      { id: 'eth{1..48}', name: 'Port {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..16}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      {
        id: 'qsfp{1..8}',
        name: 'QSFP {n}',
        medium: 'ethernet-fibre',
        connector: 'qsfp'
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c20',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'l3-switch',
    name: 'Layer 3 Switch',
    family: 'ethernet',
    drawing: 'l3-switch',
    ports: [
      { id: 'eth{1..24}', name: 'Port {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..4}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'industrial-switch',
    name: 'Industrial Switch (DIN Rail)',
    family: 'ethernet',
    drawing: 'industrial-switch',
    ports: [
      {
        id: 'eth{1..8}',
        name: 'PoE port {n}',
        medium: 'ethernet-copper',
        capabilities: ['poe-pse']
      },
      { id: 'sfp{1..2}', name: 'SFP {n}', medium: 'ethernet-fibre' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'san-switch',
    name: 'SAN Switch',
    family: 'ethernet',
    drawing: 'san-switch',
    ports: [
      { id: 'fc{1..24}', name: 'FC {n}', medium: 'fibre-channel' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'media-converter',
    name: 'Media Converter',
    family: 'ethernet',
    drawing: 'media-converter',
    ports: [
      { id: 'eth1', name: 'Copper', medium: 'ethernet-copper' },
      { id: 'sfp', name: 'Fibre', medium: 'ethernet-fibre' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'fibre-ont',
    name: 'Fibre ONT',
    family: 'ethernet',
    drawing: 'fibre-ont',
    ports: [
      { id: 'pon', name: 'PON', medium: 'ethernet-fibre', connector: 'sc' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'poe-injector',
    name: 'PoE Injector',
    family: 'ethernet',
    drawing: 'poe-injector',
    ports: [
      { id: 'data', name: 'Data in', medium: 'ethernet-copper' },
      {
        id: 'poe',
        name: 'Data and power out',
        medium: 'ethernet-copper',
        capabilities: ['poe-pse']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'sfp-module',
    name: 'SFP Module',
    family: 'ethernet',
    drawing: 'sfp-module',
    description:
      'A transceiver: its cage side plugs into a switch, its fibre side takes the patch lead.',
    ports: [
      { id: 'cage', name: 'Cage', medium: 'ethernet-fibre', connector: 'sfp' },
      { id: 'fibre', name: 'Fibre', medium: 'ethernet-fibre', connector: 'lc' }
    ]
  },
  {
    id: 'patch-panel',
    name: 'Patch Panel (24-Port)',
    family: 'ethernet',
    drawing: 'patch-panel',
    ports: [
      { id: 'front{1..24}', name: 'Front {n}', medium: 'ethernet-copper' },
      {
        id: 'rear{1..24}',
        name: 'Rear {n}',
        medium: 'ethernet-copper',
        connector: 'terminal'
      }
    ]
  },
  {
    id: 'fibre-patch-panel',
    name: 'Fibre Patch Panel (24-Port)',
    family: 'ethernet',
    drawing: 'fibre-patch-panel',
    ports: [
      {
        id: 'front{1..24}',
        name: 'Front {n}',
        medium: 'ethernet-fibre',
        connector: 'lc'
      },
      {
        id: 'rear{1..24}',
        name: 'Pigtail {n}',
        medium: 'ethernet-fibre',
        connector: 'lc'
      }
    ]
  },
  {
    id: 'network-tap',
    name: 'Network TAP',
    family: 'ethernet',
    drawing: 'network-tap',
    description:
      'A passive tap: the link passes through A and B, and a copy of each direction goes to the monitor ports.',
    ports: [
      { id: 'a', name: 'Network A', medium: 'ethernet-copper' },
      { id: 'b', name: 'Network B', medium: 'ethernet-copper' },
      { id: 'mon{1..2}', name: 'Monitor {n}', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'console-server',
    name: 'Console Server',
    family: 'ethernet',
    drawing: 'console-server',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'serial{1..16}',
        name: 'Serial {n}',
        medium: 'rs-232',
        connector: 'rj45',
        protocols: ['ascii']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'network-controller',
    name: 'Network Controller',
    family: 'ethernet',
    drawing: 'network-controller',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'cellular-router',
    name: '4G/5G Router',
    family: 'ethernet',
    drawing: 'cellular-router',
    ports: [
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      {
        id: 'ant{1..2}',
        name: 'Antenna {n}',
        medium: 'coax',
        connector: 'sma'
      },
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'sd-wan-edge',
    name: 'SD-WAN Edge',
    family: 'ethernet',
    drawing: 'sd-wan-edge',
    ports: [
      { id: 'wan{1..2}', name: 'WAN {n}', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'vpn{1..4}', name: 'Overlay {n}', medium: 'ip-tunnel' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'vpn-gateway',
    name: 'VPN Gateway',
    family: 'ethernet',
    drawing: 'vpn-gateway',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'vpn{1..8}', name: 'Tunnel {n}', medium: 'ip-tunnel' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'zero-trust-gateway',
    name: 'Zero Trust Gateway',
    family: 'ethernet',
    drawing: 'zero-trust-gateway',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'vpn', name: 'Tunnel', medium: 'ip-tunnel' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'firewall-rack',
    name: 'Firewall (Rack-Mount)',
    family: 'ethernet',
    drawing: 'firewall-rack',
    ports: [
      { id: 'wan{1..2}', name: 'WAN {n}', medium: 'ethernet-copper' },
      { id: 'lan{1..8}', name: 'LAN {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'ha', name: 'HA', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'vpn{1..8}', name: 'Tunnel {n}', medium: 'ip-tunnel' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c14',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'waf',
    name: 'Web Application Firewall',
    family: 'ethernet',
    drawing: 'waf',
    ports: [
      { id: 'eth{1..4}', name: 'Port {n}', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    family: 'ethernet',
    drawing: 'load-balancer',
    ports: [
      { id: 'eth{1..4}', name: 'Port {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'wan-optimiser',
    name: 'WAN Optimiser',
    family: 'ethernet',
    drawing: 'wan-optimiser',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'data-diode',
    name: 'Data Diode',
    family: 'ethernet',
    drawing: 'data-diode',
    description:
      'One-way link: traffic enters on the send side and leaves on the receive side, never back.',
    ports: [
      { id: 'send', name: 'Send side', medium: 'ethernet-copper' },
      { id: 'receive', name: 'Receive side', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'ids-sensor',
    name: 'IDS Sensor',
    family: 'ethernet',
    drawing: 'ids-sensor',
    ports: [
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'mon{1..2}', name: 'Monitor {n}', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'packet-capture',
    name: 'Packet Capture Appliance',
    family: 'ethernet',
    drawing: 'packet-capture',
    ports: [
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      {
        id: 'cap{1..4}',
        name: 'Capture {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'network-scanner',
    name: 'Network Scanner',
    family: 'ethernet',
    drawing: 'network-scanner',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'rack-server-1u',
    name: 'Rack Server (1U)',
    family: 'ethernet',
    drawing: 'rack-server-1u',
    ports: serverPorts()
  },
  {
    id: 'rack-server-2u',
    name: 'Rack Server (2U)',
    family: 'ethernet',
    drawing: 'rack-server-2u',
    ports: [
      { id: 'eth{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c14',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'gpu-server',
    name: 'GPU Server',
    family: 'ethernet',
    drawing: 'gpu-server',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c20',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'hypervisor-host',
    name: 'Hypervisor Host',
    family: 'ethernet',
    drawing: 'hypervisor-host',
    ports: [
      { id: 'eth{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'fc{1..2}', name: 'FC {n}', medium: 'fibre-channel' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c14',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'blade-chassis',
    name: 'Blade Chassis',
    family: 'ethernet',
    drawing: 'blade-chassis',
    ports: [
      {
        id: 'uplink{1..8}',
        name: 'Uplink {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'fc{1..4}', name: 'FC {n}', medium: 'fibre-channel' },
      { id: 'mgmt{1..2}', name: 'Management {n}', medium: 'ethernet-copper' },
      {
        id: 'ac{1..4}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c20',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'secure-server',
    name: 'Secure Server',
    family: 'ethernet',
    drawing: 'secure-server',
    ports: serverPorts()
  },
  {
    id: 'dns-server',
    name: 'DNS Server',
    family: 'ethernet',
    drawing: 'dns-server',
    ports: serverPorts()
  },
  {
    id: 'mail-server',
    name: 'Mail Server',
    family: 'ethernet',
    drawing: 'mail-server',
    ports: serverPorts()
  },
  {
    id: 'web-server',
    name: 'Web Server',
    family: 'ethernet',
    drawing: 'web-server',
    ports: serverPorts()
  },
  {
    id: 'syslog-server',
    name: 'Syslog Server',
    family: 'ethernet',
    drawing: 'syslog-server',
    ports: serverPorts()
  },
  {
    id: 'siem-server',
    name: 'SIEM / Log Server',
    family: 'ethernet',
    drawing: 'siem-server',
    ports: serverPorts()
  },
  {
    id: 'log-collector',
    name: 'Log Collector',
    family: 'ethernet',
    drawing: 'log-collector',
    ports: serverPorts()
  },
  {
    id: 'netflow-collector',
    name: 'NetFlow Collector',
    family: 'ethernet',
    drawing: 'netflow-collector',
    ports: serverPorts()
  },
  {
    id: 'network-monitor',
    name: 'Network Monitor',
    family: 'ethernet',
    drawing: 'network-monitor',
    ports: serverPorts()
  },
  {
    id: 'system-monitor',
    name: 'System Monitor',
    family: 'ethernet',
    drawing: 'system-monitor',
    ports: serverPorts()
  },
  {
    id: 'rmm-server',
    name: 'RMM Server',
    family: 'ethernet',
    drawing: 'rmm-server',
    ports: serverPorts()
  },
  {
    id: 'scada-server',
    name: 'SCADA Server',
    family: 'ethernet',
    drawing: 'scada-server',
    ports: [
      {
        id: 'eth{1..2}',
        name: 'LAN {n}',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...modbus, name: 'Serial field bus' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'historian',
    name: 'Historian',
    family: 'ethernet',
    drawing: 'historian',
    ports: serverPorts()
  },
  {
    id: 'vms-server',
    name: 'Video Management Server',
    family: 'ethernet',
    drawing: 'vms-server',
    ports: [
      {
        id: 'eth{1..2}',
        name: 'LAN {n}',
        medium: 'ethernet-copper',
        protocols: ['onvif']
      },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'backup-appliance',
    name: 'Backup Appliance',
    family: 'ethernet',
    drawing: 'backup-appliance',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      {
        id: 'sfp{1..2}',
        name: 'SFP+ {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'fc{1..2}', name: 'FC {n}', medium: 'fibre-channel' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'hsm',
    name: 'Hardware Security Module',
    family: 'ethernet',
    drawing: 'hsm',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { id: 'serial', name: 'Console', medium: 'rs-232', connector: 'db9' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'storage-array',
    name: 'Storage Array',
    family: 'ethernet',
    drawing: 'storage-array',
    ports: [
      { id: 'fc{1..8}', name: 'FC {n}', medium: 'fibre-channel' },
      {
        id: 'sfp{1..4}',
        name: 'iSCSI {n}',
        medium: 'ethernet-fibre',
        connector: 'sfp-plus'
      },
      { id: 'mgmt{1..2}', name: 'Management {n}', medium: 'ethernet-copper' },
      {
        id: 'ac{1..2}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c14',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'tape-library',
    name: 'Tape Library',
    family: 'ethernet',
    drawing: 'tape-library',
    ports: [
      { id: 'fc{1..2}', name: 'FC {n}', medium: 'fibre-channel' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'mini-pc',
    name: 'Mini PC',
    family: 'ethernet',
    drawing: 'mini-pc',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'dp', name: 'DisplayPort out', medium: 'displayport' },
      { id: 'usb{1..4}', name: 'USB {n}', medium: 'usb', connector: 'usb-a' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'thin-client',
    name: 'Thin Client',
    family: 'ethernet',
    drawing: 'thin-client',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'dp{1..2}', name: 'DisplayPort out {n}', medium: 'displayport' },
      { id: 'usb{1..4}', name: 'USB {n}', medium: 'usb', connector: 'usb-a' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'monitoring-station',
    name: 'Monitoring Station',
    family: 'ethernet',
    drawing: 'monitoring-station',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'dp{1..2}', name: 'DisplayPort out {n}', medium: 'displayport' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'soc-console',
    name: 'SOC Console',
    family: 'ethernet',
    drawing: 'soc-console',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'dp{1..3}', name: 'DisplayPort out {n}', medium: 'displayport' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'printer',
    name: 'Printer',
    family: 'ethernet',
    drawing: 'printer',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'mfp',
    name: 'Multifunction Printer',
    family: 'ethernet',
    drawing: 'mfp',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'pos-terminal',
    name: 'POS Terminal',
    family: 'ethernet',
    drawing: 'pos-terminal',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'usb{1..2}', name: 'USB {n}', medium: 'usb', connector: 'usb-a' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'conference-phone',
    name: 'Conference Phone',
    family: 'ethernet',
    drawing: 'conference-phone',
    ports: [{ ...poeIn, name: 'LAN' }]
  },
  {
    id: 'email-gateway',
    name: 'Email Gateway',
    family: 'ethernet',
    drawing: 'email-gateway',
    ports: serverPorts()
  },
  {
    id: 'ntp-server',
    name: 'NTP Time Server',
    family: 'ethernet',
    drawing: 'ntp-server',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'gps', name: 'GPS antenna', medium: 'coax', connector: 'tnc' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'industrial-firewall',
    name: 'Industrial Firewall',
    family: 'ethernet',
    drawing: 'industrial-firewall',
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'mgmt', name: 'Management', medium: 'ethernet-copper' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'oob-modem',
    name: 'Out-of-Band Modem',
    family: 'ethernet',
    drawing: 'oob-modem',
    description: 'Reaches the consoles over cellular when the network is down.',
    ports: [
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'ant', name: 'Antenna', medium: 'coax', connector: 'sma' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'serial{1..4}',
        name: 'Console {n}',
        medium: 'rs-232',
        connector: 'rj45',
        protocols: ['ascii']
      },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'kvm-switch',
    name: 'KVM Switch (Rack-Mount)',
    family: 'ethernet',
    drawing: 'kvm-switch',
    ports: [
      { id: 'video{1..8}', name: 'Server {n} video', medium: 'hdmi' },
      {
        id: 'usb{1..8}',
        name: 'Server {n} USB',
        medium: 'usb',
        connector: 'usb-b'
      },
      { id: 'console', name: 'Console video', medium: 'hdmi' },
      {
        id: 'kbd',
        name: 'Keyboard and mouse',
        medium: 'usb',
        connector: 'usb-a'
      },
      { id: 'eth1', name: 'IP access', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'sensor-manager',
    name: 'Sensor Manager',
    family: 'ethernet',
    drawing: 'sensor-manager',
    description: 'Collects from a fleet of IDS sensors.',
    ports: serverPorts()
  },

  // --- Wireless -------------------------------------------------------
  {
    id: 'wifi-ap-ceiling',
    name: 'Wi-Fi Access Point',
    family: 'wireless',
    drawing: 'wifi-ap',
    ports: [
      { id: 'eth1', medium: 'ethernet-copper', capabilities: ['poe-pd'] },
      { id: 'radio', medium: 'wi-fi', role: 'hub' }
    ]
  },

  {
    id: 'satellite-dish',
    name: 'Satellite Dish',
    drawing: 'satellite-dish',
    family: 'wireless',
    description: 'A small dish; its feed cable runs to a satellite modem.',
    ports: [
      {
        id: 'sat',
        name: 'Satellite link',
        medium: 'satellite',
        role: 'client'
      },
      { id: 'ifl', name: 'Feed to modem', medium: 'coax', connector: 'f-type' }
    ]
  },
  {
    id: 'satellite-terminal',
    name: 'Satellite Terminal',
    drawing: 'satellite-terminal',
    family: 'wireless',
    description: 'A flat-panel terminal (Starlink style) with its own modem.',
    ports: [
      {
        id: 'sat',
        name: 'Satellite link',
        medium: 'satellite',
        role: 'client'
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      dcIn
    ]
  },
  {
    id: 'satellite',
    name: 'Satellite',
    drawing: 'satellite',
    family: 'wireless',
    description:
      'A satellite in orbit, for the link up from a terminal and back down.',
    virtual: true,
    ports: [{ id: 'beam', name: 'Beam', medium: 'satellite', role: 'hub' }]
  },
  {
    id: 'wifi-ap-outdoor',
    name: 'Wi-Fi Access Point, Outdoor',
    family: 'wireless',
    drawing: 'wifi-ap-outdoor',
    ports: [
      poeIn,
      { id: 'radio', medium: 'wi-fi', role: 'hub' },
      {
        id: 'ant{1..2}',
        name: 'Antenna {n}',
        medium: 'coax',
        connector: 'n-type'
      }
    ]
  },
  {
    id: 'wifi-ap-wall-plate',
    name: 'Wi-Fi Access Point, Wall-Plate',
    family: 'wireless',
    drawing: 'wifi-ap-wall-plate',
    ports: [
      { ...poeIn, name: 'Uplink' },
      { id: 'lan{1..3}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'radio', medium: 'wi-fi', role: 'hub' }
    ]
  },
  {
    id: 'wifi-mesh-node',
    name: 'Wi-Fi Mesh Node',
    family: 'wireless',
    drawing: 'wifi-mesh-node',
    description:
      'Serves clients on one radio and joins the other nodes on the backhaul radio.',
    ports: [
      { id: 'radio', name: 'Clients', medium: 'wi-fi', role: 'hub' },
      { id: 'backhaul', name: 'Backhaul', medium: 'wi-fi', role: 'peer' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'wireless-controller',
    name: 'Wireless Controller',
    family: 'wireless',
    drawing: 'wireless-controller',
    ports: [
      { id: 'eth{1..2}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'antenna-omni',
    name: 'Omni Antenna',
    family: 'wireless',
    drawing: 'antenna-omni',
    description: 'A passive antenna: its feed runs to a radio.',
    ports: [
      { id: 'feed', name: 'Feed', medium: 'coax', connector: 'n-type' },
      { id: 'radio', medium: 'wi-fi', role: 'hub', connector: 'n-type' }
    ]
  },
  {
    id: 'antenna-sector',
    name: 'Sector Antenna',
    family: 'wireless',
    drawing: 'antenna-sector',
    description: 'A passive antenna: its feed runs to a radio.',
    ports: [
      {
        id: 'feed{1..2}',
        name: 'Feed {n}',
        medium: 'coax',
        connector: 'n-type'
      },
      { id: 'radio', medium: 'wi-fi', role: 'hub', connector: 'n-type' }
    ]
  },
  {
    id: 'ptp-bridge',
    name: 'Point-to-Point Wireless Bridge',
    family: 'wireless',
    drawing: 'ptp-bridge',
    description:
      'One end of a link; draw the other end as a second bridge and connect the two radios.',
    ports: [{ id: 'radio', name: 'Link', medium: 'wi-fi', role: 'peer' }, poeIn]
  },
  {
    id: 'lorawan-gateway',
    name: 'LoRaWAN Gateway',
    family: 'wireless',
    drawing: 'lorawan-gateway',
    ports: [
      { id: 'lora', name: 'LoRa', medium: 'lorawan', role: 'hub' },
      { id: 'ant', name: 'LoRa antenna', medium: 'coax', connector: 'n-type' },
      {
        id: 'cell',
        name: 'Cellular backhaul',
        medium: 'cellular',
        role: 'client'
      },
      poeIn
    ]
  },
  {
    id: 'zigbee-hub',
    name: 'Zigbee Hub',
    family: 'wireless',
    drawing: 'zigbee-hub',
    ports: [
      { id: 'zigbee', name: 'Zigbee', medium: 'zigbee', role: 'hub' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'iot-gateway',
    name: 'IoT Gateway',
    family: 'wireless',
    drawing: 'iot-gateway',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { id: 'zigbee', name: 'Zigbee', medium: 'zigbee', role: 'hub' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'hub' },
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      modbus,
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'iot-device',
    name: 'IoT Device',
    family: 'wireless',
    drawing: 'iot-device',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'zigbee', name: 'Zigbee', medium: 'zigbee', role: 'peer' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'lora', name: 'LoRaWAN', medium: 'lorawan', role: 'client' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'bluetooth-beacon',
    name: 'Bluetooth Beacon',
    family: 'wireless',
    drawing: 'bluetooth-beacon',
    description: 'Battery powered; it only advertises.',
    ports: [{ id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' }]
  },
  {
    id: 'tablet',
    name: 'Tablet',
    family: 'wireless',
    drawing: 'tablet',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'usb-c', name: 'USB-C', medium: 'usb', connector: 'usb-c' }
    ]
  },
  {
    id: 'mobile-phone',
    name: 'Mobile Phone',
    family: 'wireless',
    drawing: 'mobile-phone',
    ports: [
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'usb-c', name: 'USB-C', medium: 'usb', connector: 'usb-c' }
    ]
  },
  {
    id: 'wifi-repeater',
    name: 'Wi-Fi Repeater',
    family: 'wireless',
    drawing: 'wifi-repeater',
    ports: [
      { id: 'uplink', name: 'Uplink', medium: 'wi-fi', role: 'client' },
      { id: 'radio', name: 'Clients', medium: 'wi-fi', role: 'hub' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'mains-plug' }
    ]
  },

  // --- Serial and field bus -------------------------------------------
  {
    id: 'rs485-ethernet-gateway',
    name: 'RS-485 to Ethernet Gateway',
    drawing: 'rs485-ethernet-gateway',
    family: 'serial',
    ports: [
      {
        id: 'rs485',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu']
      },
      { id: 'eth1', medium: 'ethernet-copper', protocols: ['modbus-tcp'] },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'protocol-gateway',
    name: 'Protocol Gateway',
    family: 'serial',
    drawing: 'protocol-gateway',
    description: 'Translates between the field buses it has a port on.',
    ports: [
      { ...bmsIp, name: 'LAN' },
      bms485,
      {
        id: 'knx',
        name: 'KNX',
        medium: 'knx',
        role: 'through',
        protocols: ['knx']
      },
      {
        id: 'can',
        name: 'CAN',
        medium: 'can',
        role: 'through',
        protocols: ['canopen']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'plc',
    name: 'PLC',
    family: 'serial',
    drawing: 'plc',
    ports: [
      {
        id: 'eth{1..2}',
        name: 'LAN {n}',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      modbus,
      { id: 'di{1..8}', name: 'Digital in {n}', medium: 'dry-contact' },
      { id: 'do{1..4}', name: 'Digital out {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'rtu',
    name: 'RTU',
    family: 'serial',
    drawing: 'rtu',
    ports: [
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      modbus,
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'di{1..8}', name: 'Digital in {n}', medium: 'dry-contact' },
      { id: 'do{1..4}', name: 'Digital out {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'io-module',
    name: 'Remote I/O Module',
    family: 'serial',
    drawing: 'io-module',
    ports: [
      {
        id: 'eth{1..2}',
        name: 'LAN {n}',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      modbus,
      { id: 'di{1..8}', name: 'Digital in {n}', medium: 'dry-contact' },
      { id: 'do{1..8}', name: 'Digital out {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'hmi-panel',
    name: 'HMI Panel',
    family: 'serial',
    drawing: 'hmi-panel',
    ports: [
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      modbus,
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-a' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'vfd',
    name: 'Variable Frequency Drive',
    family: 'serial',
    drawing: 'vfd',
    ports: [
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      modbus,
      { id: 'run', name: 'Run command', medium: 'dry-contact' },
      { id: 'fault', name: 'Fault relay', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' },
      {
        id: 'motor',
        name: 'Motor',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'robot-arm',
    name: 'Robot Arm',
    family: 'serial',
    drawing: 'robot-arm',
    description: 'The arm and its controller cabinet as one item.',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      modbus,
      { id: 'estop', name: 'Emergency stop', medium: 'dry-contact' },
      { id: 'safety', name: 'Safety fence', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'modbus-sensor',
    name: 'Modbus RTU Sensor',
    family: 'serial',
    drawing: 'modbus-sensor',
    ports: [modbus, { ...dcIn, connector: 'terminal' }]
  },
  {
    id: 'vibration-sensor',
    name: 'Vibration Sensor',
    family: 'serial',
    drawing: 'vibration-sensor',
    ports: [
      modbus,
      { id: 'lora', name: 'LoRaWAN', medium: 'lorawan', role: 'client' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'e-stop',
    name: 'Safety Relay / E-Stop',
    family: 'serial',
    drawing: 'e-stop',
    ports: [
      { id: 'estop{1..2}', name: 'E-stop input {n}', medium: 'dry-contact' },
      { id: 'reset', name: 'Reset', medium: 'dry-contact' },
      { id: 'safe{1..2}', name: 'Safety output {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'flow-meter',
    name: 'Flow Meter',
    family: 'serial',
    drawing: 'flow-meter',
    ports: [
      modbus,
      { id: 'pulse', name: 'Pulse out', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'tank-level-radar',
    name: 'Tank Level Radar',
    family: 'serial',
    drawing: 'tank-level-radar',
    ports: [modbus, { ...dcIn, connector: 'terminal' }]
  },
  {
    id: 'conveyor',
    name: 'Conveyor',
    family: 'serial',
    drawing: 'conveyor',
    description:
      'A driven section: its motor is fed from a drive, its run and fault signals go to the PLC.',
    ports: [
      { id: 'run', name: 'Run', medium: 'dry-contact' },
      { id: 'fault', name: 'Fault', medium: 'dry-contact' },
      { id: 'estop', name: 'Pull cord', medium: 'dry-contact' },
      {
        id: 'motor',
        name: 'Motor',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-in']
      }
    ]
  },

  // --- Marine and vehicle ---------------------------------------------
  {
    id: 'n2k-tee-4way',
    name: 'NMEA 2000 4-Way Tee',
    drawing: 'n2k-tee-4way',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'in',
        name: 'Backbone in',
        medium: 'nmea-2000',
        gender: 'female',
        role: 'backbone'
      },
      {
        id: 'out',
        name: 'Backbone out',
        medium: 'nmea-2000',
        gender: 'male',
        role: 'backbone'
      },
      {
        id: 'drop{1..4}',
        name: 'Drop {n}',
        medium: 'nmea-2000',
        gender: 'female',
        role: 'drop'
      }
    ]
  },
  {
    id: 'n2k-tee',
    name: 'NMEA 2000 Tee',
    drawing: 'n2k-tee',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'in',
        name: 'Backbone in',
        medium: 'nmea-2000',
        gender: 'female',
        role: 'backbone'
      },
      {
        id: 'out',
        name: 'Backbone out',
        medium: 'nmea-2000',
        gender: 'male',
        role: 'backbone'
      },
      {
        id: 'drop',
        name: 'Drop',
        medium: 'nmea-2000',
        gender: 'female',
        role: 'drop'
      }
    ]
  },
  {
    id: 'n2k-terminator-male',
    name: 'NMEA 2000 Terminator (Male)',
    drawing: 'n2k-terminator-male',
    family: 'marine-vehicle',
    ports: [
      {
        id: 't',
        medium: 'nmea-2000',
        gender: 'male',
        role: 'backbone',
        capabilities: ['terminator']
      }
    ]
  },
  {
    id: 'n2k-terminator-female',
    name: 'NMEA 2000 Terminator (Female)',
    drawing: 'n2k-terminator-female',
    family: 'marine-vehicle',
    ports: [
      {
        id: 't',
        medium: 'nmea-2000',
        gender: 'female',
        role: 'backbone',
        capabilities: ['terminator']
      }
    ]
  },
  {
    id: 'n2k-power-injector',
    name: 'NMEA 2000 Power Injector',
    drawing: 'n2k-power-injector',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        capabilities: ['bus-power']
      },
      { ...dcIn, connector: 'wire' }
    ]
  },
  {
    id: 'chartplotter',
    name: 'Chartplotter',
    drawing: 'chartplotter',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000'],
        props: { len: 1 }
      },
      { id: 'eth1', name: 'Marine network', medium: 'ethernet-copper' },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      dcIn
    ]
  },
  {
    id: 'marine-radar',
    name: 'Radar',
    drawing: 'marine-radar',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000'],
        props: { len: 1 }
      },
      { id: 'eth1', name: 'Marine network', medium: 'ethernet-copper' },
      dcIn
    ]
  },
  {
    id: 'gps-receiver',
    name: 'GPS Receiver',
    drawing: 'gps-receiver',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000'],
        props: { len: 1 }
      }
    ]
  },
  {
    id: 'engine-gateway',
    name: 'Engine Gateway (J1939 to NMEA 2000)',
    drawing: 'engine-gateway',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000']
      },
      {
        id: 'j1939',
        medium: 'j1939',
        connector: 'deutsch-dt',
        protocols: ['j1939'],
        capabilities: ['terminator']
      }
    ]
  },

  {
    id: 'outboard-motor',
    name: 'Outboard Motor',
    drawing: 'outboard-motor',
    family: 'marine-vehicle',
    description:
      'Reports engine data on NMEA 2000, directly or through an engine gateway.',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000']
      },
      {
        id: 'dc-out',
        name: 'Charging output',
        medium: 'power-dc',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'marine-satcom-dome',
    name: 'Marine Satellite Dome',
    drawing: 'marine-satcom-dome',
    family: 'marine-vehicle',
    description:
      'A stabilised satellite antenna under a radome, with its below-deck unit.',
    ports: [
      {
        id: 'sat',
        name: 'Satellite link',
        medium: 'satellite',
        role: 'client'
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      dcIn
    ]
  },
  {
    id: 'satellite-hotspot',
    name: 'Satellite Hotspot',
    drawing: 'satellite-hotspot',
    family: 'marine-vehicle',
    description: 'A portable satellite hotspot (Iridium GO! style).',
    ports: [
      {
        id: 'sat',
        name: 'Satellite link',
        medium: 'satellite',
        role: 'client'
      },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-c' },
      dcIn
    ]
  },
  {
    id: 'satellite-hotspot-desktop',
    name: 'Satellite Hotspot, Desktop',
    drawing: 'satellite-hotspot-desktop',
    family: 'marine-vehicle',
    description: 'A fixed satellite hotspot (Iridium GO! Exec style).',
    ports: [
      {
        id: 'sat',
        name: 'Satellite link',
        medium: 'satellite',
        role: 'client'
      },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-c' },
      dcIn
    ]
  },
  {
    id: 'marine-data-hub',
    name: 'Marine Data Hub',
    drawing: 'marine-data-hub',
    family: 'marine-vehicle',
    description:
      'Joins NMEA 2000 to the boat network and a satellite or cellular link (PredictWind DataHub style); its USB port connects straight to a satellite hotspot.',
    ports: [
      {
        id: 'n2k',
        medium: 'nmea-2000',
        gender: 'male',
        protocols: ['nmea-2000']
      },
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-a' },
      { id: 'gps', name: 'GPS antenna', medium: 'coax', connector: 'sma' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'ais-transponder',
    name: 'AIS Transponder',
    drawing: 'ais-transponder',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      { id: 'vhf', name: 'VHF antenna', medium: 'coax', connector: 'pl-259' },
      { id: 'gps', name: 'GPS antenna', medium: 'coax', connector: 'tnc' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-micro-b' },
      dcIn
    ]
  },
  {
    id: 'vhf-radio',
    name: 'VHF Radio',
    drawing: 'vhf-radio',
    family: 'marine-vehicle',
    ports: [
      { id: 'ant', name: 'Antenna', medium: 'coax', connector: 'pl-259' },
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        name: 'GPS in',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      dcIn
    ]
  },
  {
    id: 'autopilot',
    name: 'Autopilot Controller',
    drawing: 'autopilot',
    family: 'marine-vehicle',
    description:
      'The course computer; its drive unit hangs off the drive output.',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      {
        id: 'drive',
        name: 'Drive unit',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { id: 'clutch', name: 'Clutch', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'heading-sensor',
    name: 'Heading Sensor',
    drawing: 'heading-sensor',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      }
    ]
  },
  {
    id: 'attitude-sensor',
    name: 'Attitude Sensor',
    drawing: 'attitude-sensor',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'rudder-sensor',
    name: 'Rudder Angle Sensor',
    drawing: 'rudder-sensor',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'speed-log',
    name: 'Speed Log',
    drawing: 'speed-log',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      }
    ]
  },
  {
    id: 'wind-instrument',
    name: 'Wind Instrument',
    drawing: 'wind-instrument',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'depth-transducer',
    name: 'Depth Transducer',
    drawing: 'depth-transducer',
    family: 'marine-vehicle',
    description: 'A smart transducer that reports straight onto the bus.',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'tank-sender',
    name: 'Tank Level Sender',
    drawing: 'tank-sender',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'instrument-display',
    name: 'Instrument Display',
    drawing: 'instrument-display',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      }
    ]
  },
  {
    id: 'n2k-gateway',
    name: 'NMEA 2000 Gateway',
    drawing: 'n2k-gateway',
    family: 'marine-vehicle',
    description:
      'Bus powered; puts the bus on USB, Ethernet or Wi-Fi for a PC or an app.',
    ports: [
      { ...n2k, props: { len: 1 } },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-a' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' }
    ]
  },
  {
    id: 'nmea0183-multiplexer',
    name: 'NMEA 0183 Multiplexer',
    drawing: 'nmea0183-multiplexer',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'in{1..4}',
        name: 'NMEA 0183 in {n}',
        medium: 'nmea-0183',
        protocols: ['nmea-0183']
      },
      {
        id: 'out{1..2}',
        name: 'NMEA 0183 out {n}',
        medium: 'nmea-0183',
        protocols: ['nmea-0183']
      },
      { ...n2k, props: { len: 1 } },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'signalk-server',
    name: 'Signal K Server',
    drawing: 'signalk-server',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { id: 'usb{1..2}', name: 'USB {n}', medium: 'usb', connector: 'usb-a' },
      dcIn
    ]
  },
  {
    id: 'marine-router',
    name: 'Marine Wi-Fi Router',
    drawing: 'marine-router',
    family: 'marine-vehicle',
    ports: [
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      {
        id: 'ant{1..2}',
        name: 'Antenna {n}',
        medium: 'coax',
        connector: 'n-type'
      },
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      {
        id: 'shore-wifi',
        name: 'Shore Wi-Fi',
        medium: 'wi-fi',
        role: 'client'
      },
      dcIn
    ]
  },
  {
    id: 'marine-thermal-camera',
    name: 'Marine Thermal Camera',
    drawing: 'marine-thermal-camera',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'eth1',
        name: 'Marine network',
        medium: 'ethernet-copper',
        protocols: ['onvif']
      },
      { ...n2k, props: { len: 1 } },
      dcIn
    ]
  },
  {
    id: 'marine-engine',
    name: 'Marine Engine',
    drawing: 'marine-engine',
    family: 'marine-vehicle',
    description: 'The engine ECU on J1939, terminated at the engine end.',
    ports: [
      {
        id: 'j1939',
        medium: 'j1939',
        connector: 'deutsch-dt',
        protocols: ['j1939'],
        capabilities: ['terminator']
      },
      {
        id: 'dc-out',
        name: 'Charging output',
        medium: 'power-dc',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'marine-generator',
    name: 'Marine Generator',
    drawing: 'marine-generator',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: 'j1939',
        medium: 'j1939',
        connector: 'deutsch-dt',
        protocols: ['j1939'],
        capabilities: ['terminator']
      },
      { id: 'remote-start', name: 'Remote start', medium: 'dry-contact' },
      {
        id: 'out',
        name: 'Output',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'electric-drive',
    name: 'Electric Drive Motor',
    drawing: 'electric-drive',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'can',
        name: 'CAN',
        medium: 'can',
        role: 'through',
        protocols: ['canopen']
      },
      { ...n2k, props: { len: 1 } },
      { id: 'throttle', name: 'Throttle', medium: 'dry-contact' },
      { ...dcIn, name: 'Battery', connector: 'terminal' }
    ]
  },
  {
    id: 'thruster',
    name: 'Bow Thruster',
    drawing: 'thruster',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'can',
        name: 'Control bus',
        medium: 'can',
        role: 'through',
        protocols: ['can-raw']
      },
      { id: 'port', name: 'Run port', medium: 'dry-contact' },
      { id: 'stbd', name: 'Run starboard', medium: 'dry-contact' },
      { ...dcIn, name: 'Battery', connector: 'terminal' }
    ]
  },
  {
    id: 'anchor-windlass',
    name: 'Anchor Windlass',
    drawing: 'anchor-windlass',
    family: 'marine-vehicle',
    ports: [
      { id: 'up', name: 'Up', medium: 'dry-contact' },
      { id: 'down', name: 'Down', medium: 'dry-contact' },
      { id: 'counter', name: 'Chain counter', medium: 'dry-contact' },
      { ...dcIn, name: 'Battery', connector: 'terminal' }
    ]
  },
  {
    id: 'bilge-pump',
    name: 'Bilge Pump',
    drawing: 'bilge-pump',
    family: 'marine-vehicle',
    ports: [
      { id: 'float', name: 'Float switch', medium: 'dry-contact' },
      { ...dcIn, connector: 'wire' }
    ]
  },
  {
    id: 'battery-monitor',
    name: 'Battery Monitor',
    drawing: 'battery-monitor',
    family: 'marine-vehicle',
    description:
      'Reads the battery through its shunt and reports on the bus or to an app.',
    ports: [
      { ...n2k, props: { len: 1 } },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      {
        id: 'shunt',
        name: 'Shunt',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'inverter-charger',
    name: 'Inverter Charger',
    drawing: 'inverter-charger',
    family: 'marine-vehicle',
    ports: [
      {
        id: 'can',
        name: 'System bus',
        medium: 'can',
        role: 'through',
        protocols: ['can-raw']
      },
      { id: 'remote', name: 'Remote on/off', medium: 'dry-contact' },
      {
        id: 'battery',
        name: 'Battery',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-in']
      },
      { ...acIn, name: 'Shore or generator in', connector: 'terminal' },
      {
        id: 'ac-out',
        name: 'AC out',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'fishfinder',
    name: 'Fishfinder Display',
    drawing: 'fishfinder',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      {
        id: '0183',
        medium: 'nmea-0183',
        role: 'through',
        protocols: ['nmea-0183']
      },
      { id: 'eth1', name: 'Marine network', medium: 'ethernet-copper' },
      dcIn
    ]
  },
  {
    id: 'chain-counter',
    name: 'Chain Counter',
    drawing: 'chain-counter',
    family: 'marine-vehicle',
    ports: [
      { ...n2k, props: { len: 1 } },
      { id: 'sensor', name: 'Gypsy sensor', medium: 'dry-contact' },
      { id: 'up', name: 'Up', medium: 'dry-contact' },
      { id: 'down', name: 'Down', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'fuel-flow-sensor',
    name: 'Fuel Flow Sensor',
    drawing: 'fuel-flow-sensor',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'exhaust-temperature-sensor',
    name: 'Exhaust Temperature Sensor',
    drawing: 'exhaust-temperature-sensor',
    family: 'marine-vehicle',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'digital-switching-module',
    name: 'Digital Switching Module',
    drawing: 'digital-switching-module',
    family: 'marine-vehicle',
    description:
      'Switches DC circuits from the bus instead of from a breaker panel.',
    ports: [
      { ...n2k, props: { len: 1 } },
      { id: 'in{1..4}', name: 'Switch input {n}', medium: 'dry-contact' },
      {
        id: 'out{1..8}',
        name: 'Circuit {n}',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...dcIn, name: 'Battery', connector: 'terminal' }
    ]
  },
  {
    id: 'instrument-remote',
    name: 'Wireless Instrument Remote',
    drawing: 'instrument-remote',
    family: 'marine-vehicle',
    ports: [{ id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' }]
  },

  // --- Security and access --------------------------------------------
  {
    id: 'ip-camera-dome',
    name: 'IP Camera (Dome)',
    family: 'security',
    drawing: 'cctv-dome',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      }
    ]
  },
  {
    id: 'ip-camera-bullet',
    name: 'IP Camera (Bullet)',
    family: 'security',
    drawing: 'cctv-bullet',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      }
    ]
  },
  {
    id: 'ip-camera-ptz',
    name: 'IP Camera (PTZ)',
    family: 'security',
    drawing: 'cctv-ptz',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'ip-camera-fisheye',
    name: 'IP Camera (Fisheye)',
    family: 'security',
    drawing: 'cctv-fisheye',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      }
    ]
  },
  {
    id: 'nvr-8',
    name: 'NVR (8-Channel PoE)',
    family: 'security',
    drawing: 'nvr',
    ports: [
      { id: 'lan', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'poe{1..8}',
        name: 'Camera {n}',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pse']
      },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'alarm-panel',
    name: 'Alarm Panel',
    family: 'security',
    drawing: 'alarm-panel',
    ports: [
      { id: 'zone{1..8}', name: 'Zone {n}', medium: 'dry-contact' },
      {
        id: 'keypad-bus',
        name: 'Keypad bus',
        medium: 'rs-485',
        role: 'through'
      },
      { id: 'eth1', name: 'IP comms', medium: 'ethernet-copper' },
      {
        id: 'siren',
        name: 'Siren output',
        medium: 'power-dc',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'alarm-keypad',
    name: 'Alarm Keypad',
    family: 'security',
    drawing: 'alarm-keypad',
    ports: [
      { id: 'bus', name: 'Keypad bus', medium: 'rs-485', role: 'through' }
    ]
  },
  {
    id: 'pir-sensor',
    name: 'PIR Sensor',
    family: 'security',
    drawing: 'pir-sensor',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'door-contact',
    name: 'Door Contact (Reed Switch)',
    family: 'security',
    drawing: 'door-contact',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' }
    ]
  },
  {
    id: 'glass-break',
    name: 'Glass-Break Detector',
    family: 'security',
    drawing: 'glass-break',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'eol-resistor',
    name: 'End-of-Line Resistor',
    drawing: 'eol-resistor',
    family: 'security',
    ports: [{ id: 'eol', medium: 'dry-contact', capabilities: ['eol'] }]
  },
  {
    id: 'card-reader',
    name: 'Card Reader',
    family: 'security',
    drawing: 'card-reader',
    ports: [
      { id: 'wiegand', name: 'Wiegand', medium: 'wiegand' },
      { id: 'osdp', name: 'OSDP', medium: 'osdp', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'exit-button',
    name: 'Exit Button',
    family: 'security',
    drawing: 'exit-button',
    ports: [{ id: 'rex', name: 'Request to exit', medium: 'dry-contact' }]
  },
  {
    id: 'maglock',
    name: 'Magnetic Lock',
    family: 'security',
    drawing: 'maglock',
    ports: [
      { id: 'bond', name: 'Bond sensor', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'intercom',
    name: 'IP Intercom',
    family: 'security',
    drawing: 'intercom',
    ports: [
      { id: 'eth1', medium: 'ethernet-copper', capabilities: ['poe-pd'] },
      { id: 'relay', name: 'Door relay', medium: 'dry-contact' }
    ]
  },
  {
    id: 'siren-strobe',
    name: 'Siren and Strobe',
    family: 'security',
    drawing: 'siren-strobe',
    ports: [
      { id: 'tamper', name: 'Tamper', medium: 'dry-contact', role: 'through' },
      {
        id: 'siren',
        name: 'Siren feed',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'turnstile',
    name: 'Turnstile',
    family: 'security',
    drawing: 'turnstile',
    ports: [
      { id: 'open-in', name: 'Open (entry)', medium: 'dry-contact' },
      { id: 'open-out', name: 'Open (exit)', medium: 'dry-contact' },
      { id: 'fire', name: 'Fire release', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'speed-gate',
    name: 'Speed Gate Lane',
    family: 'security',
    drawing: 'speed-gate',
    ports: [
      { id: 'open-in', name: 'Open (entry)', medium: 'dry-contact' },
      { id: 'open-out', name: 'Open (exit)', medium: 'dry-contact' },
      { id: 'fire', name: 'Fire release', medium: 'dry-contact' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'access-panel',
    name: 'Access Control Panel (Multi-Door)',
    family: 'security',
    drawing: 'access-panel',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'osdp{1..2}',
        name: 'Reader bus {n}',
        medium: 'osdp',
        role: 'through',
        protocols: ['osdp']
      },
      { id: 'reader{1..4}', name: 'Reader {n}', medium: 'wiegand' },
      { id: 'door{1..4}', name: 'Door contact {n}', medium: 'dry-contact' },
      { id: 'rex{1..4}', name: 'Exit button {n}', medium: 'dry-contact' },
      {
        id: 'lock{1..4}',
        name: 'Lock {n}',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'door-controller',
    name: 'Access Control Door Controller',
    family: 'security',
    drawing: 'door-controller',
    ports: [
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        capabilities: ['poe-pd']
      },
      {
        id: 'osdp',
        name: 'Reader bus',
        medium: 'osdp',
        role: 'through',
        protocols: ['osdp']
      },
      { id: 'reader{1..2}', name: 'Reader {n}', medium: 'wiegand' },
      { id: 'door', name: 'Door contact', medium: 'dry-contact' },
      { id: 'rex', name: 'Exit button', medium: 'dry-contact' },
      {
        id: 'lock',
        name: 'Lock',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'pin-reader',
    name: 'PIN Keypad Reader',
    family: 'security',
    drawing: 'pin-reader',
    ports: [
      { id: 'wiegand', name: 'Wiegand', medium: 'wiegand' },
      { id: 'osdp', name: 'OSDP', medium: 'osdp', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'biometric-scanner',
    name: 'Biometric Scanner',
    family: 'security',
    drawing: 'biometric-scanner',
    ports: [
      { id: 'wiegand', name: 'Wiegand', medium: 'wiegand' },
      { id: 'osdp', name: 'OSDP', medium: 'osdp', role: 'through' },
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        capabilities: ['poe-pd']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'electric-strike',
    name: 'Electric Strike',
    family: 'security',
    drawing: 'electric-strike',
    ports: [
      { id: 'monitor', name: 'Latch monitor', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'boom-gate',
    name: 'Boom Gate',
    family: 'security',
    drawing: 'boom-gate',
    ports: [
      { id: 'open', name: 'Open', medium: 'dry-contact' },
      { id: 'close', name: 'Close', medium: 'dry-contact' },
      { id: 'loop', name: 'Safety loop', medium: 'dry-contact' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'visitor-kiosk',
    name: 'Visitor Kiosk',
    family: 'security',
    drawing: 'visitor-kiosk',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'usb', name: 'Badge printer', medium: 'usb', connector: 'usb-a' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'badge-printer',
    name: 'Badge Printer',
    family: 'security',
    drawing: 'badge-printer',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'key-cabinet',
    name: 'Key Cabinet',
    family: 'security',
    drawing: 'key-cabinet',
    description:
      'An electronic key cabinet with a keypad or reader on the door.',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'reader', name: 'Reader', medium: 'wiegand' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'panic-button',
    name: 'Panic / Duress Button',
    family: 'security',
    drawing: 'panic-button',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' }
    ]
  },
  {
    id: 'perimeter-beam',
    name: 'Perimeter Beam',
    family: 'security',
    drawing: 'perimeter-beam',
    description: 'One end of a beam pair; draw the other end as a second beam.',
    ports: [
      { id: 'alarm', name: 'Alarm', medium: 'dry-contact', role: 'through' },
      { id: 'tamper', name: 'Tamper', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'zone-expander',
    name: 'Alarm Zone Expander',
    family: 'security',
    drawing: 'zone-expander',
    ports: [
      { id: 'bus', name: 'Keypad bus', medium: 'rs-485', role: 'through' },
      { id: 'zone{1..8}', name: 'Zone {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'alarm-communicator',
    name: 'Alarm Communicator',
    family: 'security',
    drawing: 'alarm-communicator',
    ports: [
      { id: 'bus', name: 'Panel bus', medium: 'rs-485', role: 'through' },
      { id: 'eth1', name: 'IP comms', medium: 'ethernet-copper' },
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'intercom-master',
    name: 'Intercom Master Station',
    family: 'security',
    drawing: 'intercom-master',
    ports: [poeIn]
  },
  {
    id: 'cctv-box',
    name: 'Box Camera',
    family: 'security',
    drawing: 'cctv-box',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      },
      {
        id: 'video',
        name: 'Analogue video',
        medium: 'coax',
        connector: 'bnc',
        protocols: ['analog-video']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'cctv-turret',
    name: 'Turret Camera',
    family: 'security',
    drawing: 'cctv-turret',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      }
    ]
  },
  {
    id: 'cctv-lpr',
    name: 'Number-Plate (LPR) Camera',
    family: 'security',
    drawing: 'cctv-lpr',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      },
      { id: 'trigger', name: 'Trigger / relay', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'cctv-thermal',
    name: 'Thermal Camera',
    family: 'security',
    drawing: 'cctv-thermal',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      },
      { id: 'alarm', name: 'Alarm out', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'cctv-multisensor',
    name: 'Multi-Sensor Camera',
    family: 'security',
    drawing: 'cctv-multisensor',
    ports: [
      {
        id: 'eth1',
        medium: 'ethernet-copper',
        protocols: ['onvif'],
        capabilities: ['poe-pd']
      }
    ]
  },
  {
    id: 'video-encoder',
    name: 'Video Encoder',
    family: 'security',
    drawing: 'video-encoder',
    description: 'Puts analogue cameras on the IP network.',
    ports: [
      {
        id: 'video{1..4}',
        name: 'Video in {n}',
        medium: 'coax',
        connector: 'bnc',
        protocols: ['analog-video']
      },
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        protocols: ['onvif']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'body-worn-camera',
    name: 'Body-Worn Camera',
    family: 'security',
    drawing: 'body-worn-camera',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'usb-c', name: 'Dock', medium: 'usb', connector: 'usb-c' }
    ]
  },
  {
    id: 'camera-poe-injector',
    name: 'PoE Camera Injector',
    family: 'security',
    drawing: 'camera-poe-injector',
    ports: [
      { id: 'data', name: 'Data in', medium: 'ethernet-copper' },
      {
        id: 'poe',
        name: 'Camera',
        medium: 'ethernet-copper',
        capabilities: ['poe-pse']
      },
      { ...acIn, connector: 'mains-plug' }
    ]
  },
  {
    id: 'doorbell-camera',
    name: 'Doorbell Camera',
    family: 'security',
    drawing: 'doorbell-camera',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'chime', name: 'Chime', medium: 'dry-contact' },
      { ...acIn, name: 'Bell transformer', connector: 'terminal' }
    ]
  },
  {
    id: 'duress-pendant',
    name: 'Duress Pendant',
    family: 'security',
    drawing: 'duress-pendant',
    ports: [{ id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' }]
  },
  {
    id: 'ir-illuminator',
    name: 'IR Illuminator',
    family: 'security',
    drawing: 'ir-illuminator',
    ports: [
      { id: 'trigger', name: 'Trigger', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'lift-access-reader',
    name: 'Lift Access Reader',
    family: 'security',
    drawing: 'lift-access-reader',
    ports: [
      { id: 'wiegand', name: 'Wiegand', medium: 'wiegand' },
      { id: 'osdp', name: 'OSDP', medium: 'osdp', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'osdp-converter',
    name: 'Wiegand to OSDP Converter',
    family: 'security',
    drawing: 'osdp-converter',
    ports: [
      { id: 'reader', name: 'Reader (Wiegand)', medium: 'wiegand' },
      {
        id: 'osdp',
        name: 'OSDP',
        medium: 'osdp',
        role: 'through',
        protocols: ['osdp']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'lock-power-supply',
    name: 'Lock Power Supply',
    family: 'security',
    drawing: 'lock-power-supply',
    ports: [
      { id: 'fire', name: 'Fire release', medium: 'dry-contact' },
      { id: 'fault', name: 'Fault', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' },
      {
        id: 'lock{1..8}',
        name: 'Lock {n}',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'mantrap',
    name: 'Door Interlock (Mantrap)',
    family: 'security',
    drawing: 'mantrap',
    ports: [
      { id: 'door{1..2}', name: 'Door {n} contact', medium: 'dry-contact' },
      { id: 'request{1..2}', name: 'Door {n} request', medium: 'dry-contact' },
      {
        id: 'lock{1..2}',
        name: 'Door {n} lock',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'outdoor-detector',
    name: 'Outdoor Dual-Tech Detector',
    family: 'security',
    drawing: 'outdoor-detector',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' },
      { id: 'tamper', name: 'Tamper', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'roller-door-contact',
    name: 'Roller-Door Contact',
    family: 'security',
    drawing: 'roller-door-contact',
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' }
    ]
  },
  {
    id: 'smart-lock',
    name: 'Smart Lock',
    family: 'security',
    drawing: 'smart-lock',
    description: 'Battery powered.',
    ports: [
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'zigbee', name: 'Zigbee', medium: 'zigbee', role: 'peer' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' }
    ]
  },

  // --- Fire -----------------------------------------------------------
  {
    id: 'fire-panel-2-loop',
    name: 'Fire Panel (2-Loop)',
    family: 'fire',
    drawing: 'fire-panel',
    ports: [
      {
        id: 'loop{1..2}-out',
        name: 'Loop {n} out',
        medium: 'fire-loop',
        role: 'loop-out',
        capabilities: ['bus-power']
      },
      {
        id: 'loop{1..2}-in',
        name: 'Loop {n} return',
        medium: 'fire-loop',
        role: 'loop-return'
      },
      {
        id: 'hli',
        name: 'High-level interface',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu'],
        capabilities: ['terminator']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'smoke-detector',
    name: 'Smoke Detector (Addressable)',
    family: 'fire',
    drawing: 'smoke-detector',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      }
    ]
  },
  {
    id: 'heat-detector',
    name: 'Heat Detector (Addressable)',
    family: 'fire',
    drawing: 'heat-detector',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      }
    ]
  },
  {
    id: 'manual-call-point',
    name: 'Manual Call Point (Addressable)',
    family: 'fire',
    drawing: 'manual-call-point',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      }
    ]
  },
  {
    id: 'fire-isolator',
    name: 'Loop Isolator Module',
    drawing: 'fire-isolator',
    family: 'fire',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        capabilities: ['isolator']
      }
    ]
  },
  {
    id: 'gas-suppression-cylinder',
    name: 'Gas Suppression Cylinder',
    family: 'fire',
    drawing: 'fire-suppression',
    ports: [
      { id: 'release', name: 'Release', medium: 'dry-contact' },
      { id: 'pressure', name: 'Low pressure', medium: 'dry-contact' }
    ]
  },
  {
    id: 'ewis-panel',
    name: 'Emergency Warning Panel',
    family: 'fire',
    drawing: 'ewis-panel',
    description:
      'Occupant warning: speaker lines out, triggered by the fire panel.',
    ports: [
      { id: 'spk{1..4}', name: 'Speaker line {n}', medium: 'speaker-100v' },
      {
        id: 'wip{1..4}',
        name: 'Warden intercom line {n}',
        medium: 'analog-audio',
        connector: 'terminal'
      },
      { id: 'trigger', name: 'Fire panel trigger', medium: 'dry-contact' },
      { id: 'fault', name: 'Fault', medium: 'dry-contact' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'fire-sounder',
    name: 'Fire Sounder (Addressable)',
    family: 'fire',
    drawing: 'fire-sounder',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      }
    ]
  },
  {
    id: 'beam-detector',
    name: 'Beam Detector (Addressable)',
    family: 'fire',
    drawing: 'beam-detector',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'aspirating-detector',
    name: 'Aspirating Smoke Detector',
    family: 'fire',
    drawing: 'aspirating-detector',
    ports: [
      {
        id: 'loop',
        medium: 'fire-loop',
        role: 'through',
        protocols: ['fire-addressable']
      },
      { id: 'alarm', name: 'Alarm relay', medium: 'dry-contact' },
      { id: 'fault', name: 'Fault relay', medium: 'dry-contact' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'sprinkler-flow-switch',
    name: 'Sprinkler Flow Switch',
    family: 'fire',
    drawing: 'sprinkler-flow-switch',
    ports: [{ id: 'zone', name: 'Zone', medium: 'fire-zone', role: 'through' }]
  },
  {
    id: 'warden-intercom',
    name: 'Warden Intercom Point',
    family: 'fire',
    drawing: 'warden-intercom',
    ports: [
      {
        id: 'line',
        name: 'Warden intercom line',
        medium: 'analog-audio',
        connector: 'terminal'
      }
    ]
  },
  {
    id: 'fire-damper',
    name: 'Fire Damper',
    family: 'fire',
    drawing: 'fire-damper',
    description:
      'A motorised damper: closed by the fire panel, position reported to the BMS.',
    ports: [
      { id: 'close', name: 'Close command', medium: 'dry-contact' },
      { id: 'open', name: 'Open position', medium: 'dry-contact' },
      { id: 'closed', name: 'Closed position', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },

  // --- AV -------------------------------------------------------------
  {
    id: 'projector',
    name: 'Projector',
    family: 'av',
    drawing: 'projector',
    ports: [
      { id: 'hdmi{1..2}', name: 'HDMI {n}', medium: 'hdmi' },
      { id: 'eth1', name: 'Control', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'wall-display',
    name: 'Wall Display',
    family: 'av',
    drawing: 'display-wall-55',
    ports: [
      {
        id: 'hdmi{1..3}',
        name: 'HDMI {n}',
        medium: 'hdmi',
        protocols: ['hdmi', 'cec']
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'monitor',
    name: 'Monitor',
    family: 'av',
    drawing: 'monitor',
    ports: [
      { id: 'hdmi', name: 'HDMI', medium: 'hdmi' },
      { id: 'dp', name: 'DisplayPort', medium: 'displayport' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'monitor-ultrawide',
    name: 'Monitor (Ultrawide)',
    family: 'av',
    drawing: 'monitor-34-ultrawide',
    ports: [
      { id: 'hdmi', name: 'HDMI', medium: 'hdmi' },
      { id: 'dp', name: 'DisplayPort', medium: 'displayport' },
      { id: 'usb-c', name: 'USB-C', medium: 'usb', connector: 'usb-c' },
      {
        id: 'usb{1..2}',
        name: 'USB hub {n}',
        medium: 'usb',
        connector: 'usb-a'
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'kvm-console-cart',
    name: 'KVM Console Cart',
    family: 'av',
    drawing: 'kvm-console',
    ports: [
      { id: 'hdmi', name: 'Video in', medium: 'hdmi' },
      {
        id: 'usb',
        name: 'Keyboard and mouse',
        medium: 'usb',
        connector: 'usb-a'
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'video-bar',
    name: 'Video Bar',
    family: 'av',
    drawing: 'video-bar',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'usb', name: 'USB-C', medium: 'usb', connector: 'usb-c' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'ceiling-speaker-100v',
    name: 'Ceiling Speaker (100 V)',
    family: 'av',
    drawing: 'speaker-ceiling',
    ports: [
      {
        id: 'line',
        name: '100 V line',
        medium: 'speaker-100v',
        role: 'through'
      }
    ]
  },
  {
    id: 'amplifier',
    name: 'Amplifier',
    family: 'av',
    drawing: 'amplifier',
    ports: [
      {
        id: 'in{1..2}',
        name: 'Line in {n}',
        medium: 'analog-audio',
        connector: 'xlr-3'
      },
      {
        id: 'dante',
        name: 'Dante',
        medium: 'ethernet-copper',
        protocols: ['dante']
      },
      { id: 'line{1..2}', name: '100 V line {n}', medium: 'speaker-100v' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'audio-dsp',
    name: 'Audio DSP',
    family: 'av',
    drawing: 'audio-dsp',
    ports: [
      {
        id: 'in{1..8}',
        name: 'Mic/line in {n}',
        medium: 'analog-audio',
        connector: 'terminal'
      },
      {
        id: 'out{1..8}',
        name: 'Line out {n}',
        medium: 'analog-audio',
        connector: 'terminal'
      },
      {
        id: 'dante',
        name: 'Dante',
        medium: 'ethernet-copper',
        protocols: ['dante']
      },
      { id: 'eth1', name: 'Control', medium: 'ethernet-copper' },
      {
        id: 'serial',
        name: 'RS-232',
        medium: 'rs-232',
        connector: 'db9',
        protocols: ['ascii']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'ceiling-microphone',
    name: 'Ceiling Microphone',
    family: 'av',
    drawing: 'ceiling-microphone',
    ports: [
      { ...poeIn, name: 'Dante (PoE)', protocols: ['dante'] },
      {
        id: 'out',
        name: 'Analogue out',
        medium: 'analog-audio',
        connector: 'terminal'
      }
    ]
  },
  {
    id: 'conference-camera',
    name: 'Conference Camera (PTZ)',
    family: 'av',
    drawing: 'conference-camera',
    ports: [
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-c' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        capabilities: ['poe-pd']
      },
      {
        id: 'serial',
        name: 'RS-232 control',
        medium: 'rs-232',
        connector: 'rj45',
        protocols: ['ascii']
      },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'matrix-switcher',
    name: 'Matrix Switcher',
    family: 'av',
    drawing: 'matrix-switcher',
    ports: [
      { id: 'in{1..8}', name: 'HDMI in {n}', medium: 'hdmi' },
      { id: 'out{1..8}', name: 'HDMI out {n}', medium: 'hdmi' },
      { id: 'eth1', name: 'Control', medium: 'ethernet-copper' },
      {
        id: 'serial',
        name: 'RS-232 control',
        medium: 'rs-232',
        connector: 'db9',
        protocols: ['ascii']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'video-wall',
    name: 'Video Wall',
    family: 'av',
    drawing: 'video-wall',
    description: 'The wall as one item: one feed per panel.',
    ports: [
      { id: 'hdmi{1..4}', name: 'Panel {n} in', medium: 'hdmi' },
      { id: 'eth1', name: 'Control', medium: 'ethernet-copper' },
      {
        id: 'ac{1..4}',
        name: 'Mains in {n}',
        medium: 'power-ac',
        connector: 'iec-c14',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'smart-tv',
    name: 'Smart TV',
    family: 'av',
    drawing: 'smart-tv',
    ports: [
      {
        id: 'hdmi{1..3}',
        name: 'HDMI {n}',
        medium: 'hdmi',
        protocols: ['hdmi', 'cec']
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      {
        id: 'aerial',
        name: 'Aerial',
        medium: 'coax',
        connector: 'iec-tv',
        protocols: ['dvb-t']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'wireless-presentation',
    name: 'Wireless Presentation Hub',
    family: 'av',
    drawing: 'wireless-presentation',
    ports: [
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'hub' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'signage-player',
    name: 'Digital Signage Player',
    family: 'av',
    drawing: 'signage-player',
    ports: [
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'room-panel',
    name: 'Room Booking Panel',
    family: 'av',
    drawing: 'room-panel',
    ports: [poeIn]
  },
  {
    id: 'touch-panel',
    name: 'Touch Control Panel',
    family: 'av',
    drawing: 'touch-panel',
    ports: [poeIn]
  },
  {
    id: 'lectern',
    name: 'Lectern',
    family: 'av',
    drawing: 'lectern',
    description: 'The connection plate on an AV lectern.',
    ports: [
      { id: 'hdmi-in', name: 'Laptop HDMI', medium: 'hdmi' },
      { id: 'hdmi-out', name: 'To display', medium: 'hdmi' },
      {
        id: 'mic',
        name: 'Microphone',
        medium: 'analog-audio',
        connector: 'xlr-3'
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'gpo{1..2}',
        name: 'Power outlet {n}',
        medium: 'power-ac',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'mains-plug' }
    ]
  },
  {
    id: 'hearing-loop-amplifier',
    name: 'Hearing Loop Amplifier',
    family: 'av',
    drawing: 'hearing-loop-amplifier',
    ports: [
      {
        id: 'in{1..2}',
        name: 'Audio in {n}',
        medium: 'analog-audio',
        connector: 'xlr-3'
      },
      {
        id: 'loop',
        name: 'Loop',
        medium: 'analog-audio',
        connector: 'terminal'
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'wireless-mic-receiver',
    name: 'Wireless Microphone Receiver',
    family: 'av',
    drawing: 'wireless-mic-receiver',
    ports: [
      {
        id: 'ant{1..2}',
        name: 'Antenna {n}',
        medium: 'coax',
        connector: 'bnc'
      },
      {
        id: 'out',
        name: 'Audio out',
        medium: 'analog-audio',
        connector: 'xlr-3'
      },
      {
        id: 'dante',
        name: 'Dante',
        medium: 'ethernet-copper',
        protocols: ['dante']
      },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'smart-speaker',
    name: 'Smart Speaker',
    family: 'av',
    drawing: 'smart-speaker',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'soundbar',
    name: 'Soundbar',
    family: 'av',
    drawing: 'soundbar',
    ports: [
      {
        id: 'hdmi',
        name: 'HDMI ARC',
        medium: 'hdmi',
        protocols: ['hdmi', 'cec']
      },
      { id: 'aux', name: 'Aux in', medium: 'analog-audio', connector: 'trs' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },

  // --- Power ----------------------------------------------------------
  {
    id: 'ups',
    name: 'UPS (Network Managed)',
    family: 'power',
    drawing: 'ups-tower',
    ports: [
      { id: 'mgmt', name: 'Network card', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { ...acIn, connector: 'iec-c14' },
      {
        id: 'out{1..6}',
        name: 'Outlet {n}',
        medium: 'power-ac',
        connector: 'iec-c13',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'ups-floor',
    name: 'UPS (Floor-Standing, Network Managed)',
    family: 'power',
    drawing: 'ups-large',
    ports: [
      { id: 'mgmt', name: 'Network card', medium: 'ethernet-copper' },
      {
        id: 'bms',
        name: 'BMS',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu']
      },
      { ...acIn, connector: 'terminal' },
      {
        id: 'out',
        name: 'Output',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'transfer-switch',
    name: 'Transfer Switch Panel',
    family: 'power',
    drawing: 'ats-panel',
    ports: [
      {
        id: 'mgmt',
        name: 'Controller',
        medium: 'ethernet-copper',
        protocols: ['modbus-tcp']
      },
      { id: 'gen-start', name: 'Generator start', medium: 'dry-contact' },
      {
        id: 'mains',
        name: 'Mains in',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-in']
      },
      {
        id: 'standby',
        name: 'Standby in',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-in']
      },
      {
        id: 'load',
        name: 'Load',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'standby-generator',
    name: 'Standby Generator',
    family: 'power',
    drawing: 'generator',
    ports: [
      {
        id: 'controller',
        name: 'Controller',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu']
      },
      { id: 'remote-start', name: 'Remote start', medium: 'dry-contact' },
      {
        id: 'out',
        name: 'Output',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'rack-pdu',
    name: 'Rack PDU',
    family: 'power',
    drawing: 'rack-pdu',
    ports: [
      { id: 'mgmt', name: 'Network card', medium: 'ethernet-copper' },
      {
        id: 'sensor',
        name: 'Environment sensor',
        medium: 'rs-485',
        role: 'through'
      },
      { ...acIn, connector: 'iec-c20' },
      {
        id: 'out{1..24}',
        name: 'Outlet {n}',
        medium: 'power-ac',
        connector: 'iec-c13',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'rack-ups',
    name: 'UPS (Rack-Mount, Network Managed)',
    family: 'power',
    drawing: 'rack-ups',
    ports: [
      { id: 'mgmt', name: 'Network card', medium: 'ethernet-copper' },
      { id: 'usb', name: 'USB', medium: 'usb', connector: 'usb-b' },
      { id: 'epo', name: 'Emergency power off', medium: 'dry-contact' },
      { ...acIn, connector: 'iec-c14' },
      {
        id: 'out{1..8}',
        name: 'Outlet {n}',
        medium: 'power-ac',
        connector: 'iec-c13',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'ev-charger',
    name: 'EV Charger',
    family: 'power',
    drawing: 'ev-charger',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { ...modbus, name: 'Load management' },
      { ...acIn, connector: 'terminal' },
      {
        id: 'charge',
        name: 'Charging socket',
        medium: 'power-ac',
        connector: 'type-2',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'solar-inverter',
    name: 'Solar Inverter',
    family: 'power',
    drawing: 'solar-inverter',
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...modbus, name: 'Meter / battery' },
      {
        id: 'pv{1..2}',
        name: 'PV string {n}',
        medium: 'power-dc',
        connector: 'mc4',
        capabilities: ['power-in']
      },
      {
        id: 'battery',
        name: 'Battery',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-in']
      },
      {
        id: 'ac-out',
        name: 'Grid',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'battery-storage',
    name: 'Battery Storage',
    family: 'power',
    drawing: 'battery-storage',
    description: 'A home or site battery with its management system.',
    ports: [
      {
        id: 'can',
        name: 'Inverter comms',
        medium: 'can',
        role: 'through',
        protocols: ['can-raw']
      },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      {
        id: 'dc',
        name: 'Battery',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'solar-controller',
    name: 'Solar Charge Controller',
    family: 'power',
    drawing: 'solar-controller',
    ports: [
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      {
        id: 'can',
        name: 'System bus',
        medium: 'can',
        role: 'through',
        protocols: ['can-raw']
      },
      {
        id: 'pv',
        name: 'PV',
        medium: 'power-dc',
        connector: 'mc4',
        capabilities: ['power-in']
      },
      {
        id: 'battery',
        name: 'Battery',
        medium: 'power-dc',
        connector: 'terminal',
        capabilities: ['power-out']
      }
    ]
  },
  {
    id: 'rack-ats',
    name: 'Rack ATS',
    family: 'power',
    drawing: 'rack-ats',
    ports: [
      { id: 'mgmt', name: 'Network card', medium: 'ethernet-copper' },
      {
        id: 'in-a',
        name: 'Source A',
        medium: 'power-ac',
        connector: 'iec-c20',
        capabilities: ['power-in']
      },
      {
        id: 'in-b',
        name: 'Source B',
        medium: 'power-ac',
        connector: 'iec-c20',
        capabilities: ['power-in']
      },
      {
        id: 'out{1..8}',
        name: 'Outlet {n}',
        medium: 'power-ac',
        connector: 'iec-c13',
        capabilities: ['power-out']
      }
    ]
  },

  // --- Building control -----------------------------------------------
  {
    id: 'crac-unit',
    name: 'Precision Air Conditioner (CRAC)',
    family: 'building',
    drawing: 'crac-unit',
    ports: [
      {
        id: 'eth1',
        name: 'BMS (IP)',
        medium: 'ethernet-copper',
        protocols: ['bacnet-ip', 'modbus-tcp']
      },
      {
        id: 'bms',
        name: 'BMS (RS-485)',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu', 'bacnet-mstp']
      },
      { id: 'fire', name: 'Fire shutdown', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'in-row-cooler',
    name: 'In-Row Cooler',
    family: 'building',
    drawing: 'in-row-cooler',
    ports: [
      {
        id: 'eth1',
        name: 'BMS (IP)',
        medium: 'ethernet-copper',
        protocols: ['bacnet-ip', 'modbus-tcp']
      },
      {
        id: 'bms',
        name: 'BMS (RS-485)',
        medium: 'rs-485',
        role: 'through',
        protocols: ['modbus-rtu', 'bacnet-mstp']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'exit-sign',
    name: 'Exit Sign (DALI-2)',
    family: 'building',
    drawing: 'exit-sign',
    ports: [
      {
        id: 'dali',
        name: 'DALI',
        medium: 'dali-2',
        role: 'through',
        protocols: ['dali-2']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'emergency-light',
    name: 'Emergency Light (DALI-2)',
    family: 'building',
    drawing: 'emergency-light',
    ports: [
      {
        id: 'dali',
        name: 'DALI',
        medium: 'dali-2',
        role: 'through',
        protocols: ['dali-2']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'bms-controller',
    name: 'BMS Controller',
    family: 'building',
    drawing: 'bms-controller',
    ports: [
      bmsIp,
      { ...bms485, id: 'bus{1..2}', name: 'Field bus {n}' },
      { id: 'di{1..8}', name: 'Digital in {n}', medium: 'dry-contact' },
      { id: 'do{1..8}', name: 'Digital out {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'hvac-controller',
    name: 'HVAC Controller',
    family: 'building',
    drawing: 'hvac-controller',
    ports: [
      bmsIp,
      bms485,
      { id: 'di{1..4}', name: 'Digital in {n}', medium: 'dry-contact' },
      { id: 'do{1..4}', name: 'Digital out {n}', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'thermostat',
    name: 'Smart Thermostat',
    family: 'building',
    drawing: 'thermostat',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      {
        id: 'bms',
        name: 'BMS',
        medium: 'rs-485',
        role: 'through',
        protocols: ['bacnet-mstp', 'modbus-rtu']
      },
      { id: 'call', name: 'Call for heating / cooling', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'chiller',
    name: 'Chiller',
    family: 'building',
    drawing: 'chiller',
    ports: [
      bmsIp,
      bms485,
      { id: 'enable', name: 'Remote enable', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'split-system',
    name: 'Split System Air Conditioner',
    family: 'building',
    drawing: 'split-system',
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...bms485, name: 'BMS adapter' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'lighting-controller',
    name: 'Lighting Controller (DALI)',
    family: 'building',
    drawing: 'lighting-controller',
    description: 'Drives and powers the DALI lines; talks to the BMS over IP.',
    ports: [
      {
        id: 'dali{1..4}',
        name: 'DALI line {n}',
        medium: 'dali-2',
        protocols: ['dali-2'],
        capabilities: ['bus-power']
      },
      {
        id: 'eth1',
        name: 'LAN',
        medium: 'ethernet-copper',
        protocols: ['bacnet-ip']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'light-fitting',
    name: 'Light Fitting (DALI-2)',
    family: 'building',
    drawing: 'light-fitting',
    ports: [
      {
        id: 'dali',
        name: 'DALI',
        medium: 'dali-2',
        role: 'through',
        protocols: ['dali-2']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'blind-controller',
    name: 'Blind Controller (KNX)',
    family: 'building',
    drawing: 'blind-controller',
    ports: [
      {
        id: 'knx',
        name: 'KNX',
        medium: 'knx',
        role: 'through',
        protocols: ['knx']
      },
      {
        id: 'motor{1..4}',
        name: 'Blind motor {n}',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'occupancy-sensor',
    name: 'Occupancy Sensor (DALI-2)',
    family: 'building',
    drawing: 'occupancy-sensor',
    ports: [
      {
        id: 'dali',
        name: 'DALI',
        medium: 'dali-2',
        role: 'through',
        protocols: ['dali-2']
      }
    ]
  },
  {
    id: 'air-quality-sensor',
    name: 'Air Quality Sensor',
    family: 'building',
    drawing: 'air-quality-sensor',
    ports: [
      { ...bms485, name: 'BMS' },
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'temperature-humidity-sensor',
    name: 'Temperature and Humidity Sensor',
    family: 'building',
    drawing: 'temperature-humidity-sensor',
    ports: [
      { ...bms485, name: 'BMS' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'water-leak-sensor',
    name: 'Water Leak Sensor',
    family: 'building',
    drawing: 'water-leak-sensor',
    ports: [
      {
        id: 'alarm',
        name: 'Leak alarm',
        medium: 'dry-contact',
        role: 'through'
      },
      { id: 'zigbee', name: 'Zigbee', medium: 'zigbee', role: 'peer' }
    ]
  },
  {
    id: 'rack-env-sensor',
    name: 'Rack Environment Sensor',
    family: 'building',
    drawing: 'rack-env-sensor',
    description:
      'Temperature, humidity and door contacts for one rack; reports to a PDU or over the network.',
    ports: [
      poeIn,
      { id: 'sensor', name: 'Sensor bus', medium: 'rs-485', role: 'through' },
      { id: 'door{1..2}', name: 'Door contact {n}', medium: 'dry-contact' }
    ]
  },
  {
    id: 'lift-controller',
    name: 'Lift Controller',
    family: 'building',
    drawing: 'lift-controller',
    ports: [
      bmsIp,
      bms485,
      { id: 'fire', name: 'Fire recall', medium: 'dry-contact' },
      { id: 'phone', name: 'Emergency phone', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'energy-meter',
    name: 'Energy Meter',
    family: 'building',
    drawing: 'energy-meter',
    ports: [
      modbus,
      { id: 'pulse', name: 'Pulse out', medium: 'dry-contact' },
      {
        id: 'supply',
        name: 'Measured supply',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'utility-meter',
    name: 'Utility Meter',
    family: 'building',
    drawing: 'utility-meter',
    description:
      'A smart meter read remotely over cellular or LoRaWAN, with a pulse output for the BMS.',
    ports: [
      { id: 'cell', name: 'Cellular', medium: 'cellular', role: 'client' },
      { id: 'lora', name: 'LoRaWAN', medium: 'lorawan', role: 'client' },
      { id: 'pulse', name: 'Pulse out', medium: 'dry-contact' },
      {
        id: 'supply',
        name: 'Measured supply',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-in']
      }
    ]
  },
  {
    id: 'co2-sensor',
    name: 'CO2 Sensor',
    family: 'building',
    drawing: 'co2-sensor',
    ports: [
      { ...bms485, name: 'BMS' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'cooling-tower',
    name: 'Cooling Tower',
    family: 'building',
    drawing: 'cooling-tower',
    ports: [
      bmsIp,
      bms485,
      { id: 'enable', name: 'Remote enable', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'lighting-dimmer',
    name: 'Lighting Dimmer',
    family: 'building',
    drawing: 'lighting-dimmer',
    ports: [
      {
        id: 'dali',
        name: 'DALI',
        medium: 'dali-2',
        role: 'through',
        protocols: ['dali-2']
      },
      {
        id: 'load{1..4}',
        name: 'Load {n}',
        medium: 'power-ac',
        connector: 'terminal',
        capabilities: ['power-out']
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'valve-actuator',
    name: 'Valve Actuator',
    family: 'building',
    drawing: 'valve-actuator',
    ports: [
      bms485,
      { id: 'open', name: 'Open', medium: 'dry-contact' },
      { id: 'closed', name: 'Closed', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },

  // --- Virtual --------------------------------------------------------
  {
    id: 'internet',
    name: 'Internet',
    drawing: 'internet',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'wan{1..8}', medium: 'ethernet-copper', role: 'hub' }]
  },
  {
    id: 'vpn-tunnel',
    name: 'VPN Tunnel',
    drawing: 'vpn-tunnel',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'a', medium: 'ip-tunnel', protocols: ['wireguard'] },
      { id: 'b', medium: 'ip-tunnel', protocols: ['wireguard'] }
    ]
  },
  {
    id: 'cloud-service',
    name: 'Cloud Service',
    drawing: 'cloud-service',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'tunnel', medium: 'ip-tunnel' },
      { id: 'public', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'isp',
    name: 'ISP',
    drawing: 'isp',
    family: 'virtual',
    virtual: true,
    description:
      'The carrier: a WAN link lands here on its way to the internet.',
    ports: [
      {
        id: 'access{1..8}',
        name: 'Access {n}',
        medium: 'ethernet-copper',
        role: 'hub'
      },
      {
        id: 'upstream',
        name: 'Upstream',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'virtual-machine',
    name: 'Virtual Machine',
    drawing: 'virtual-machine',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'nic{1..2}', name: 'vNIC {n}', medium: 'ethernet-copper' }]
  },
  {
    id: 'database-service',
    name: 'Database Service',
    drawing: 'database-service',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'tunnel', medium: 'ip-tunnel' },
      { id: 'public', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'saas-app',
    name: 'SaaS Application',
    drawing: 'saas-app',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'public', medium: 'ethernet-copper', role: 'hub' }]
  },
  {
    id: 'cdn',
    name: 'CDN',
    drawing: 'cdn',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'edge', name: 'Edge', medium: 'ethernet-copper', role: 'hub' },
      { id: 'origin', name: 'Origin', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'nat-gateway',
    name: 'Public IP / NAT',
    drawing: 'nat-gateway',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'inside', name: 'Inside', medium: 'ethernet-copper', role: 'hub' },
      { id: 'outside', name: 'Outside', medium: 'ethernet-copper' }
    ]
  },
  // --- Second pass, 2026-10-20: referenced devices and cloud services ---
  {
    id: 'drone',
    name: 'Drone',
    family: 'wireless',
    drawing: 'drone',
    ports: [
      { id: 'wifi', name: 'Control link', medium: 'wi-fi', role: 'client' }
    ]
  },
  {
    id: 'weather-station',
    name: 'Weather Station',
    family: 'marine-vehicle',
    drawing: 'weather-station',
    ports: [{ ...n2k, props: { len: 1 } }]
  },
  {
    id: 'perimeter-fence',
    name: 'Perimeter Fence',
    family: 'security',
    drawing: 'perimeter-fence',
    description:
      'An electrified fence zone: the energiser reports alarm and tamper.',
    ports: [
      { id: 'alarm', name: 'Alarm', medium: 'dry-contact', role: 'through' },
      { id: 'tamper', name: 'Tamper', medium: 'dry-contact', role: 'through' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'projector-screen',
    name: 'Projector Screen',
    family: 'av',
    drawing: 'projector-screen',
    ports: [
      {
        id: 'control',
        name: 'Up / down',
        medium: 'dry-contact',
        role: 'through'
      },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'marina-pedestal',
    name: 'Marina Pedestal',
    family: 'power',
    drawing: 'marina-pedestal',
    ports: [
      {
        id: 'outlet{1..2}',
        name: 'Shore outlet {n}',
        medium: 'power-ac',
        connector: 'mains-socket',
        capabilities: ['power-out']
      },
      { id: 'eth1', name: 'Metering', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    drawing: 'api-gateway',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'public', name: 'Clients', medium: 'ethernet-copper', role: 'hub' },
      { id: 'backend{1..4}', name: 'Backend {n}', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'virtual-network',
    name: 'Virtual Network',
    drawing: 'virtual-network',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'member', name: 'Members', medium: 'ethernet-copper', role: 'hub' },
      { id: 'peer', name: 'Peering', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'bastion-host',
    name: 'Bastion Host',
    drawing: 'bastion-host',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'public', name: 'Public', medium: 'ethernet-copper' },
      { id: 'private', name: 'Private', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'transit-hub',
    name: 'Transit Hub',
    drawing: 'transit-hub',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'attach{1..8}',
        name: 'Attachment {n}',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'dedicated-cloud-link',
    name: 'Dedicated Cloud Link',
    drawing: 'dedicated-cloud-link',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'site', name: 'Site', medium: 'ethernet-fibre' },
      { id: 'cloud', name: 'Cloud', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'event-bus',
    name: 'Event Bus',
    drawing: 'event-bus',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'producer',
        name: 'Producers',
        medium: 'ethernet-copper',
        role: 'hub'
      },
      {
        id: 'consumer',
        name: 'Consumers',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'stream-processing',
    name: 'Stream Processing',
    drawing: 'stream-processing',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'in',
        name: 'Input stream',
        medium: 'ethernet-copper',
        role: 'hub'
      },
      { id: 'out', name: 'Output', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    drawing: 'data-pipeline',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'source', name: 'Sources', medium: 'ethernet-copper', role: 'hub' },
      { id: 'sink', name: 'Sink', medium: 'ethernet-copper' }
    ]
  },
  {
    id: 'data-warehouse',
    name: 'Data Warehouse',
    drawing: 'data-warehouse',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'client', name: 'Clients', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'block-storage',
    name: 'Block Storage',
    drawing: 'block-storage',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'attach', name: 'Attached to', medium: 'ethernet-copper' }]
  },
  {
    id: 'file-share',
    name: 'File Share',
    drawing: 'file-share',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'client', name: 'Clients', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'cache-service',
    name: 'Cache Service',
    drawing: 'cache-service',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'client', name: 'Clients', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'secrets-manager',
    name: 'Secrets Manager',
    drawing: 'secrets-manager',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'client', name: 'Clients', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'monitoring-service',
    name: 'Monitoring Service',
    drawing: 'monitoring-service',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'agent', name: 'Agents', medium: 'ethernet-copper', role: 'hub' }
    ]
  },
  {
    id: 'log-analytics',
    name: 'Log Analytics',
    drawing: 'log-analytics',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'source',
        name: 'Log sources',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'ml-model',
    name: 'Machine Learning Model',
    drawing: 'ml-model',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'endpoint',
        name: 'Endpoint',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    drawing: 'notification-service',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'api', name: 'API', medium: 'ethernet-copper', role: 'hub' }]
  },
  {
    id: 'container-registry',
    name: 'Container Registry',
    drawing: 'container-registry',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'pull',
        name: 'Pull / push',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  },
  {
    id: 'workflow-automation',
    name: 'Workflow Automation',
    drawing: 'workflow-automation',
    family: 'virtual',
    virtual: true,
    ports: [
      {
        id: 'trigger',
        name: 'Triggers and actions',
        medium: 'ethernet-copper',
        role: 'hub'
      }
    ]
  }
];
