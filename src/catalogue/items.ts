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
  }
];
