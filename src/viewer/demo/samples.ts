// The sample diagrams (samples/*.json), for the viewer's demo page and the
// examples app.
import officeNetwork from '../../../samples/office-network.json';
import threeTierWeb from '../../../samples/three-tier-web.json';
import awsServerless from '../../../samples/aws-serverless.json';
import twoFloorBuilding from '../../../samples/two-floor-building.json';
import builtInDevices from '../../../samples/built-in-devices.json';
import mixedIcons from '../../../samples/mixed-icons.json';

export interface Sample {
  id: string;
  name: string;
  scene: unknown;
}

export const SAMPLES: Sample[] = [
  { id: 'office-network', name: 'Office network', scene: officeNetwork },
  { id: 'three-tier-web', name: 'Three-tier web app', scene: threeTierWeb },
  { id: 'aws-serverless', name: 'AWS serverless', scene: awsServerless },
  {
    id: 'two-floor-building',
    name: 'Two-floor building',
    scene: twoFloorBuilding
  },
  { id: 'built-in-devices', name: 'Built-in devices', scene: builtInDevices },
  { id: 'mixed-icons', name: 'Mixed icons', scene: mixedIcons }
];
