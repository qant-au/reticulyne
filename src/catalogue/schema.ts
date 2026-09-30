import { z } from 'zod';

// The catalogue: media, protocols and items (docs/catalogue.md). Plain
// data validated by one schema. The shape of each entry is checked here;
// `validateCatalogue` then checks the references between the three
// registries and the port rules.

const kebab = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Ids are kebab-case: a-z 0-9 and -');

const name = z.string().min(1).max(200);
const scalarProps = z.record(
  z.string().min(1).max(200),
  z.union([z.string().max(2_000), z.number(), z.boolean()])
);

export const TOPOLOGIES = [
  'point-to-point',
  'bus',
  'loop',
  'wireless'
] as const;

/** Palette sections, in display order. */
export const FAMILIES = [
  'ethernet',
  'wireless',
  'serial',
  'marine-vehicle',
  'building',
  'security',
  'fire',
  'av',
  'power',
  'virtual'
] as const;

export const FAMILY_NAMES: Record<Family, string> = {
  ethernet: 'Ethernet and IP',
  wireless: 'Wireless',
  serial: 'Serial and field bus',
  'marine-vehicle': 'Marine and vehicle',
  building: 'Building control',
  security: 'Security and access',
  fire: 'Fire',
  av: 'AV',
  power: 'Power',
  virtual: 'Virtual'
};

export const PORT_ROLES = [
  'device',
  'through',
  'backbone',
  'drop',
  'loop-out',
  'loop-return',
  'hub',
  'client',
  'peer'
] as const;

export const CAPABILITIES = [
  'poe-pse',
  'poe-pd',
  'power-in',
  'power-out',
  'bus-power',
  'terminator',
  'eol',
  'isolator'
] as const;

export const mediumSchema = z.strictObject({
  id: kebab,
  name,
  family: z.enum(FAMILIES),
  topology: z.enum(TOPOLOGIES),
  basedOn: kebab.optional(),
  connectors: z.array(kebab).min(1),
  protocols: z.array(kebab).optional(),
  termination: z.enum(['both-ends', 'eol']).optional(),
  busPower: z.boolean().optional()
});

export const protocolSchema = z.strictObject({
  id: kebab,
  name,
  media: z.array(kebab).min(1)
});

export const catalogueLinkSchema = z.strictObject({
  source: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,39}$/),
  ref: z.string().min(1).max(200)
});

export const portTemplateSchema = z.strictObject({
  // A port id, or a pattern: 'eth{1..24}' expands to eth1 .. eth24.
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[A-Za-z0-9_-]*(\{\d+\.\.\d+\}[A-Za-z0-9_-]*)?$/),
  name: name.optional(),
  medium: kebab,
  connector: kebab.optional(),
  gender: z.enum(['male', 'female']).optional(),
  role: z.enum(PORT_ROLES).optional(),
  protocols: z.array(kebab).optional(),
  capabilities: z.array(z.enum(CAPABILITIES)).optional(),
  props: scalarProps.optional()
});

export const catalogueItemSchema = z.strictObject({
  id: kebab,
  name,
  family: z.enum(FAMILIES),
  description: z.string().max(2_000).optional(),
  icon: z.string().min(1).max(200).optional(),
  virtual: z.boolean().optional(),
  ports: z.array(portTemplateSchema),
  props: scalarProps.optional(),
  links: z.array(catalogueLinkSchema).optional()
});

export const catalogueSchema = z.strictObject({
  media: z.array(mediumSchema),
  protocols: z.array(protocolSchema),
  items: z.array(catalogueItemSchema)
});

export type Topology = (typeof TOPOLOGIES)[number];
export type Family = (typeof FAMILIES)[number];
export type PortRole = (typeof PORT_ROLES)[number];
export type Capability = (typeof CAPABILITIES)[number];
export type Medium = z.infer<typeof mediumSchema>;
export type Protocol = z.infer<typeof protocolSchema>;
export type CatalogueLink = z.infer<typeof catalogueLinkSchema>;
export type PortTemplate = z.infer<typeof portTemplateSchema>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type Catalogue = z.infer<typeof catalogueSchema>;
