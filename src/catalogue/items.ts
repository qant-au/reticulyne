import type { CatalogueItem, CatalogueLink } from './schema';

// The seed items: the network, AV, security and fire devices that have an
// Accurona twin, the bus infrastructure and devices of the worked examples
// in docs/catalogue.md, and virtual items.
//
// `twin(id)` is the cross-reference to an Accurona element. The vendoring
// script (scripts/sync-accurona.mjs) reads these calls to pick which
// isometric and schematic drawings to bring in, so keep each one a literal id.
// An item with no twin has its schematic drawn in symbols.ts.

const twin = (ref: string): CatalogueLink[] => {
  return [{ source: 'accurona', ref }];
};

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

export const ITEMS: CatalogueItem[] = [
  // --- Ethernet and IP ------------------------------------------------
  {
    id: 'network-switch-24',
    name: 'Network switch (24-port)',
    family: 'ethernet',
    links: twin('network-switch'),
    ports: [
      { id: 'eth{1..24}', name: 'Port {n}', medium: 'ethernet-copper' },
      { id: 'sfp{1..4}', name: 'SFP {n}', medium: 'ethernet-fibre' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'poe-switch-8',
    name: 'PoE switch (8-port)',
    family: 'ethernet',
    links: twin('network-switch'),
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
    links: twin('router'),
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
    links: twin('firewall'),
    ports: [
      { id: 'wan', name: 'WAN', medium: 'ethernet-copper' },
      { id: 'lan{1..4}', name: 'LAN {n}', medium: 'ethernet-copper' },
      { id: 'vpn', name: 'VPN', medium: 'ip-tunnel' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'nbn-modem',
    name: 'NBN modem',
    family: 'ethernet',
    links: twin('modem-nbn'),
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
    links: twin('nas'),
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
    links: twin('server-tower'),
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
    links: twin('pc-tower'),
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
    links: twin('laptop'),
    ports: [
      { id: 'wifi', name: 'Wi-Fi', medium: 'wi-fi', role: 'client' },
      { id: 'bt', name: 'Bluetooth', medium: 'bluetooth', role: 'peer' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'usb-c', name: 'USB-C', medium: 'usb', connector: 'usb-c' }
    ]
  },
  {
    id: 'ip-phone',
    name: 'IP phone',
    family: 'ethernet',
    links: twin('ip-phone'),
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
    name: 'Data outlet',
    family: 'ethernet',
    links: twin('data-outlet'),
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
    name: 'Floor box',
    family: 'ethernet',
    links: twin('floor-box'),
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
    name: 'Fibre termination cabinet',
    family: 'ethernet',
    links: twin('odf-panel'),
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

  // --- Wireless -------------------------------------------------------
  {
    id: 'wifi-ap-ceiling',
    name: 'Wi-Fi access point',
    family: 'wireless',
    links: twin('wifi-ap'),
    ports: [
      { id: 'eth1', medium: 'ethernet-copper', capabilities: ['poe-pd'] },
      { id: 'radio', medium: 'wi-fi', role: 'hub' }
    ]
  },

  // --- Serial and field bus -------------------------------------------
  {
    id: 'rs485-ethernet-gateway',
    name: 'RS-485 to Ethernet gateway',
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

  // --- Marine and vehicle ---------------------------------------------
  {
    id: 'n2k-tee-4way',
    name: 'NMEA 2000 4-way tee',
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
    name: 'NMEA 2000 tee',
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
    name: 'NMEA 2000 terminator (male)',
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
    name: 'NMEA 2000 terminator (female)',
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
    name: 'NMEA 2000 power injector',
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
    name: 'GPS receiver',
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
    name: 'Engine gateway (J1939 to NMEA 2000)',
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

  // --- Security and access --------------------------------------------
  {
    id: 'ip-camera-dome',
    name: 'IP camera (dome)',
    family: 'security',
    links: twin('cctv-dome'),
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
    name: 'IP camera (bullet)',
    family: 'security',
    links: twin('cctv-bullet'),
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
    name: 'IP camera (PTZ)',
    family: 'security',
    links: twin('cctv-ptz'),
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
    name: 'IP camera (fisheye)',
    family: 'security',
    links: twin('cctv-fisheye'),
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
    name: 'NVR (8-channel PoE)',
    family: 'security',
    links: twin('nvr'),
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
    name: 'Alarm panel',
    family: 'security',
    links: twin('alarm-panel'),
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
    name: 'Alarm keypad',
    family: 'security',
    links: twin('alarm-keypad'),
    ports: [
      { id: 'bus', name: 'Keypad bus', medium: 'rs-485', role: 'through' }
    ]
  },
  {
    id: 'pir-sensor',
    name: 'PIR sensor',
    family: 'security',
    links: twin('pir-sensor'),
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'door-contact',
    name: 'Door contact (reed switch)',
    family: 'security',
    links: twin('door-contact'),
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' }
    ]
  },
  {
    id: 'glass-break',
    name: 'Glass-break detector',
    family: 'security',
    links: twin('glass-break'),
    ports: [
      { id: 'zone', name: 'Zone', medium: 'dry-contact', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'eol-resistor',
    name: 'End-of-line resistor',
    family: 'security',
    ports: [{ id: 'eol', medium: 'dry-contact', capabilities: ['eol'] }]
  },
  {
    id: 'card-reader',
    name: 'Card reader',
    family: 'security',
    links: twin('card-reader'),
    ports: [
      { id: 'wiegand', name: 'Wiegand', medium: 'wiegand' },
      { id: 'osdp', name: 'OSDP', medium: 'osdp', role: 'through' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'exit-button',
    name: 'Exit button',
    family: 'security',
    links: twin('exit-button'),
    ports: [{ id: 'rex', name: 'Request to exit', medium: 'dry-contact' }]
  },
  {
    id: 'maglock',
    name: 'Magnetic lock',
    family: 'security',
    links: twin('maglock'),
    ports: [
      { id: 'bond', name: 'Bond sensor', medium: 'dry-contact' },
      { ...dcIn, connector: 'terminal' }
    ]
  },
  {
    id: 'intercom',
    name: 'IP intercom',
    family: 'security',
    links: twin('intercom'),
    ports: [
      { id: 'eth1', medium: 'ethernet-copper', capabilities: ['poe-pd'] },
      { id: 'relay', name: 'Door relay', medium: 'dry-contact' }
    ]
  },
  {
    id: 'siren-strobe',
    name: 'Siren and strobe',
    family: 'security',
    links: twin('siren-strobe'),
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
    links: twin('turnstile'),
    ports: [
      { id: 'open-in', name: 'Open (entry)', medium: 'dry-contact' },
      { id: 'open-out', name: 'Open (exit)', medium: 'dry-contact' },
      { id: 'fire', name: 'Fire release', medium: 'dry-contact' },
      { ...acIn, connector: 'terminal' }
    ]
  },
  {
    id: 'speed-gate',
    name: 'Speed gate lane',
    family: 'security',
    links: twin('speed-gate'),
    ports: [
      { id: 'open-in', name: 'Open (entry)', medium: 'dry-contact' },
      { id: 'open-out', name: 'Open (exit)', medium: 'dry-contact' },
      { id: 'fire', name: 'Fire release', medium: 'dry-contact' },
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { ...acIn, connector: 'terminal' }
    ]
  },

  // --- Fire -----------------------------------------------------------
  {
    id: 'fire-panel-2-loop',
    name: 'Fire panel (2-loop)',
    family: 'fire',
    links: twin('fire-panel'),
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
    name: 'Smoke detector (addressable)',
    family: 'fire',
    links: twin('smoke-detector'),
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
    name: 'Heat detector (addressable)',
    family: 'fire',
    links: twin('heat-detector'),
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
    name: 'Manual call point (addressable)',
    family: 'fire',
    links: twin('manual-call-point'),
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
    name: 'Loop isolator module',
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
    name: 'Gas suppression cylinder',
    family: 'fire',
    links: twin('fire-suppression'),
    ports: [
      { id: 'release', name: 'Release', medium: 'dry-contact' },
      { id: 'pressure', name: 'Low pressure', medium: 'dry-contact' }
    ]
  },

  // --- AV -------------------------------------------------------------
  {
    id: 'projector',
    name: 'Projector',
    family: 'av',
    links: twin('projector'),
    ports: [
      { id: 'hdmi{1..2}', name: 'HDMI {n}', medium: 'hdmi' },
      { id: 'eth1', name: 'Control', medium: 'ethernet-copper' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'wall-display',
    name: 'Wall display',
    family: 'av',
    links: twin('display-wall-55'),
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
    links: twin('monitor'),
    ports: [
      { id: 'hdmi', name: 'HDMI', medium: 'hdmi' },
      { id: 'dp', name: 'DisplayPort', medium: 'displayport' },
      { ...acIn, connector: 'iec-c14' }
    ]
  },
  {
    id: 'monitor-ultrawide',
    name: 'Monitor (ultrawide)',
    family: 'av',
    links: twin('monitor-34-ultrawide'),
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
    name: 'KVM console cart',
    family: 'av',
    links: twin('kvm-console'),
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
    name: 'Video bar',
    family: 'av',
    links: twin('video-bar'),
    ports: [
      { id: 'eth1', name: 'LAN', medium: 'ethernet-copper' },
      { id: 'hdmi', name: 'HDMI out', medium: 'hdmi' },
      { id: 'usb', name: 'USB-C', medium: 'usb', connector: 'usb-c' },
      { ...dcIn, connector: 'barrel' }
    ]
  },
  {
    id: 'ceiling-speaker-100v',
    name: 'Ceiling speaker (100 V)',
    family: 'av',
    links: twin('speaker-ceiling'),
    ports: [
      {
        id: 'line',
        name: '100 V line',
        medium: 'speaker-100v',
        role: 'through'
      }
    ]
  },

  // --- Power ----------------------------------------------------------
  {
    id: 'ups',
    name: 'UPS (network managed)',
    family: 'power',
    links: twin('ups-tower'),
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
    name: 'UPS (floor-standing, network managed)',
    family: 'power',
    links: twin('ups-large'),
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
    name: 'Transfer switch panel',
    family: 'power',
    links: twin('ats-panel'),
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
    name: 'Standby generator',
    family: 'power',
    links: twin('generator'),
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

  // --- Building control -----------------------------------------------
  {
    id: 'crac-unit',
    name: 'Precision air conditioner (CRAC)',
    family: 'building',
    links: twin('crac-unit'),
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
    name: 'In-row cooler',
    family: 'building',
    links: twin('in-row-cooler'),
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
    name: 'Exit sign (DALI-2)',
    family: 'building',
    links: twin('exit-sign'),
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
    name: 'Emergency light (DALI-2)',
    family: 'building',
    links: twin('emergency-light'),
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

  // --- Virtual --------------------------------------------------------
  {
    id: 'internet',
    name: 'Internet',
    family: 'virtual',
    virtual: true,
    ports: [{ id: 'wan{1..8}', medium: 'ethernet-copper', role: 'hub' }]
  },
  {
    id: 'vpn-tunnel',
    name: 'VPN tunnel',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'a', medium: 'ip-tunnel', protocols: ['wireguard'] },
      { id: 'b', medium: 'ip-tunnel', protocols: ['wireguard'] }
    ]
  },
  {
    id: 'cloud-service',
    name: 'Cloud service',
    family: 'virtual',
    virtual: true,
    ports: [
      { id: 'tunnel', medium: 'ip-tunnel' },
      { id: 'public', medium: 'ethernet-copper' }
    ]
  }
];
