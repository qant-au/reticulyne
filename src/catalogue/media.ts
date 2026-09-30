import type { Medium, Protocol } from './schema';

// The seed media and protocols, as specified in docs/catalogue.md. A medium
// is what can be plugged together; a protocol is what is spoken over it.

const ETHERNET_PROTOCOLS = [
  'ip',
  'modbus-tcp',
  'bacnet-ip',
  'knx-ip',
  'dante',
  'art-net',
  'sacn',
  'onvif'
];

export const MEDIA: Medium[] = [
  {
    id: 'ethernet-copper',
    name: 'Ethernet (copper)',
    family: 'ethernet',
    topology: 'point-to-point',
    connectors: ['rj45', 'm12-x', 'm12-d', 'terminal'],
    protocols: ETHERNET_PROTOCOLS
  },
  {
    id: 'ethernet-fibre',
    name: 'Ethernet (fibre)',
    family: 'ethernet',
    topology: 'point-to-point',
    connectors: ['sfp', 'sfp-plus', 'qsfp', 'lc', 'sc', 'st'],
    protocols: ETHERNET_PROTOCOLS
  },
  {
    id: 'wi-fi',
    name: 'Wi-Fi',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal', 'rp-sma', 'n-type'],
    protocols: ['ip']
  },
  {
    id: 'zigbee',
    name: 'Zigbee',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal'],
    protocols: ['zigbee']
  },
  {
    id: 'z-wave',
    name: 'Z-Wave',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal'],
    protocols: ['z-wave']
  },
  {
    id: 'lorawan',
    name: 'LoRaWAN',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal', 'sma', 'n-type'],
    protocols: ['lorawan']
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal'],
    protocols: ['bluetooth']
  },
  {
    id: 'cellular',
    name: 'Cellular',
    family: 'wireless',
    topology: 'wireless',
    connectors: ['internal', 'sma', 'n-type', 'sim'],
    protocols: ['ip']
  },
  {
    id: 'rs-232',
    name: 'RS-232',
    family: 'serial',
    topology: 'point-to-point',
    connectors: ['db9', 'db25', 'rj45', 'terminal'],
    protocols: ['modbus-rtu', 'ascii']
  },
  {
    id: 'rs-422',
    name: 'RS-422',
    family: 'serial',
    topology: 'point-to-point',
    connectors: ['terminal', 'db9', 'rj45'],
    protocols: ['modbus-rtu', 'ascii']
  },
  {
    id: 'rs-485',
    name: 'RS-485',
    family: 'serial',
    topology: 'bus',
    connectors: ['terminal', 'rj45', 'db9'],
    protocols: ['modbus-rtu', 'bacnet-mstp', 'ascii'],
    termination: 'both-ends'
  },
  {
    id: 'usb',
    name: 'USB',
    family: 'serial',
    topology: 'point-to-point',
    connectors: ['usb-a', 'usb-b', 'usb-c', 'usb-micro-b'],
    protocols: ['usb']
  },
  {
    id: 'can',
    name: 'CAN',
    family: 'serial',
    topology: 'bus',
    connectors: ['terminal', 'db9', 'm12-a'],
    protocols: ['canopen', 'can-raw'],
    termination: 'both-ends'
  },
  {
    id: 'nmea-2000',
    name: 'NMEA 2000',
    family: 'marine-vehicle',
    topology: 'bus',
    basedOn: 'can',
    connectors: ['micro-c', 'mini-c'],
    protocols: ['nmea-2000'],
    termination: 'both-ends',
    busPower: true
  },
  {
    id: 'nmea-0183',
    name: 'NMEA 0183',
    family: 'marine-vehicle',
    topology: 'bus',
    basedOn: 'rs-422',
    connectors: ['terminal', 'wire'],
    protocols: ['nmea-0183']
  },
  {
    id: 'j1939',
    name: 'J1939',
    family: 'marine-vehicle',
    topology: 'bus',
    basedOn: 'can',
    connectors: ['deutsch-dt', 'deutsch-hd10', 'terminal'],
    protocols: ['j1939'],
    termination: 'both-ends'
  },
  {
    id: 'knx',
    name: 'KNX TP',
    family: 'building',
    topology: 'bus',
    connectors: ['knx-terminal'],
    protocols: ['knx'],
    busPower: true
  },
  {
    id: 'dali-2',
    name: 'DALI-2',
    family: 'building',
    topology: 'bus',
    connectors: ['terminal'],
    protocols: ['dali-2'],
    busPower: true
  },
  {
    id: 'wiegand',
    name: 'Wiegand',
    family: 'security',
    topology: 'point-to-point',
    connectors: ['terminal'],
    protocols: ['wiegand']
  },
  {
    id: 'osdp',
    name: 'OSDP',
    family: 'security',
    topology: 'bus',
    basedOn: 'rs-485',
    connectors: ['terminal'],
    protocols: ['osdp'],
    termination: 'both-ends'
  },
  {
    id: 'dry-contact',
    name: 'Dry contact / alarm zone',
    family: 'security',
    topology: 'bus',
    connectors: ['terminal'],
    termination: 'eol'
  },
  {
    id: 'fire-loop',
    name: 'Fire loop (addressable)',
    family: 'fire',
    topology: 'loop',
    connectors: ['terminal'],
    protocols: ['fire-addressable']
  },
  {
    id: 'fire-zone',
    name: 'Fire zone (conventional)',
    family: 'fire',
    topology: 'bus',
    connectors: ['terminal'],
    termination: 'eol'
  },
  {
    id: 'hdmi',
    name: 'HDMI',
    family: 'av',
    topology: 'point-to-point',
    connectors: ['hdmi-a', 'hdmi-mini', 'hdmi-micro'],
    protocols: ['hdmi', 'cec']
  },
  {
    id: 'displayport',
    name: 'DisplayPort',
    family: 'av',
    topology: 'point-to-point',
    connectors: ['dp', 'mini-dp', 'usb-c'],
    protocols: ['displayport']
  },
  {
    id: 'coax',
    name: 'Coax',
    family: 'av',
    topology: 'point-to-point',
    connectors: ['bnc', 'f-type', 'iec-tv', 'sma', 'n-type'],
    protocols: ['analog-video', 'hd-tvi', 'hd-cvi', 'ahd', 'dvb-t', 'catv']
  },
  {
    id: 'speaker-100v',
    name: '100 V speaker line',
    family: 'av',
    topology: 'bus',
    connectors: ['terminal']
  },
  {
    id: 'dmx512',
    name: 'DMX512',
    family: 'av',
    topology: 'bus',
    basedOn: 'rs-485',
    connectors: ['xlr-5', 'xlr-3', 'rj45', 'terminal'],
    protocols: ['dmx512', 'rdm'],
    termination: 'both-ends'
  },
  {
    id: 'power-ac',
    name: 'Power (AC)',
    family: 'power',
    topology: 'point-to-point',
    connectors: [
      'iec-c13',
      'iec-c14',
      'iec-c19',
      'iec-c20',
      'mains-socket',
      'mains-plug',
      'terminal'
    ]
  },
  {
    id: 'power-dc',
    name: 'Power (DC)',
    family: 'power',
    topology: 'point-to-point',
    connectors: ['barrel', 'terminal', 'anderson', 'wire']
  },
  {
    id: 'ip-tunnel',
    name: 'IP tunnel',
    family: 'virtual',
    topology: 'point-to-point',
    connectors: ['none'],
    protocols: ['ipsec', 'wireguard', 'openvpn']
  }
];

const ETHERNET = ['ethernet-copper', 'ethernet-fibre'];
const SERIAL = ['rs-232', 'rs-422', 'rs-485'];

export const PROTOCOLS: Protocol[] = [
  { id: 'ip', name: 'IP', media: [...ETHERNET, 'wi-fi', 'cellular'] },
  { id: 'modbus-tcp', name: 'Modbus TCP', media: ETHERNET },
  { id: 'bacnet-ip', name: 'BACnet/IP', media: ETHERNET },
  { id: 'knx-ip', name: 'KNX IP', media: ETHERNET },
  { id: 'dante', name: 'Dante', media: ETHERNET },
  { id: 'art-net', name: 'Art-Net', media: ETHERNET },
  { id: 'sacn', name: 'sACN', media: ETHERNET },
  { id: 'onvif', name: 'ONVIF', media: ETHERNET },
  { id: 'zigbee', name: 'Zigbee', media: ['zigbee'] },
  { id: 'z-wave', name: 'Z-Wave', media: ['z-wave'] },
  { id: 'lorawan', name: 'LoRaWAN', media: ['lorawan'] },
  { id: 'bluetooth', name: 'Bluetooth', media: ['bluetooth'] },
  { id: 'modbus-rtu', name: 'Modbus RTU', media: SERIAL },
  { id: 'ascii', name: 'ASCII serial', media: SERIAL },
  { id: 'bacnet-mstp', name: 'BACnet MS/TP', media: ['rs-485'] },
  { id: 'usb', name: 'USB', media: ['usb'] },
  { id: 'canopen', name: 'CANopen', media: ['can'] },
  { id: 'can-raw', name: 'CAN (raw frames)', media: ['can'] },
  { id: 'nmea-2000', name: 'NMEA 2000', media: ['nmea-2000'] },
  { id: 'nmea-0183', name: 'NMEA 0183', media: ['nmea-0183'] },
  { id: 'j1939', name: 'J1939', media: ['j1939'] },
  { id: 'knx', name: 'KNX', media: ['knx'] },
  { id: 'dali-2', name: 'DALI-2', media: ['dali-2'] },
  { id: 'wiegand', name: 'Wiegand', media: ['wiegand'] },
  { id: 'osdp', name: 'OSDP', media: ['osdp'] },
  {
    id: 'fire-addressable',
    name: 'Addressable fire protocol',
    media: ['fire-loop']
  },
  { id: 'hdmi', name: 'HDMI', media: ['hdmi'] },
  { id: 'cec', name: 'HDMI-CEC', media: ['hdmi'] },
  { id: 'displayport', name: 'DisplayPort', media: ['displayport'] },
  { id: 'analog-video', name: 'Analogue video', media: ['coax'] },
  { id: 'hd-tvi', name: 'HD-TVI', media: ['coax'] },
  { id: 'hd-cvi', name: 'HD-CVI', media: ['coax'] },
  { id: 'ahd', name: 'AHD', media: ['coax'] },
  { id: 'dvb-t', name: 'DVB-T', media: ['coax'] },
  { id: 'catv', name: 'CATV', media: ['coax'] },
  { id: 'dmx512', name: 'DMX512', media: ['dmx512'] },
  { id: 'rdm', name: 'RDM', media: ['dmx512'] },
  { id: 'ipsec', name: 'IPsec', media: ['ip-tunnel'] },
  { id: 'wireguard', name: 'WireGuard', media: ['ip-tunnel'] },
  { id: 'openvpn', name: 'OpenVPN', media: ['ip-tunnel'] }
];
