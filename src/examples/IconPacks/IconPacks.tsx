import Reticulyne from 'src/Reticulyne';
import type { Scene } from 'src/core';
import type { IconPack } from 'src/icons/pack';
import type { IconPackEntry } from 'src/icons/packRegistry';
import flagsPack from '../../../packs/nautical-flags/nautical-flags.reticulyne-pack.json';
import { useExamplesThemeMode } from '../themeModeContext';
import { useExamplesValidationError } from '../openErrorContext';

// Icon packs from code: the app loads the Nautical Flags pack itself and
// locks it (removable: false), so the Icon packs dialog lists it as loaded
// by the app, with no Remove, and refuses an install over it. The diagram
// is a hoist of two flags, Uniform over Whiskey, joined on the pack's own
// Halyard medium: in the International Code, "UW" wishes a pleasant voyage.
// The scene names the flags' icons without carrying them; the editor takes
// them from the pack (docs/icon-packs.md).

const iconPacks: IconPackEntry[] = [
  { pack: flagsPack as IconPack, removable: false }
];

const halyardPorts = [
  { id: 'hoist-top', name: 'Hoist top', kind: 'halyard' },
  { id: 'hoist-bottom', name: 'Hoist bottom', kind: 'halyard' }
];

const hoist: Scene = {
  format: 'reticulyne-scene',
  version: 2,
  id: 'pleasant-voyage',
  title: 'A pleasant voyage',
  description:
    'UW: two flags on one halyard, from the Nautical Flags pack loaded in code.',
  objects: [
    {
      id: 'uniform',
      name: 'Uniform (U)',
      icon: 'nautical-flags-uniform',
      ports: halyardPorts
    },
    {
      id: 'whiskey',
      name: 'Whiskey (W)',
      icon: 'nautical-flags-whiskey',
      ports: halyardPorts
    }
  ],
  connections: [
    {
      id: 'halyard',
      from: 'uniform',
      to: 'whiskey',
      fromPort: 'hoist-bottom',
      toPort: 'hoist-top',
      kind: 'halyard'
    }
  ],
  views: [
    {
      id: 'main',
      kind: 'iso',
      name: 'Hoist',
      placements: [
        { object: 'uniform', tile: { x: 0, y: -2 } },
        { object: 'whiskey', tile: { x: 0, y: 2 } }
      ],
      connectors: [
        {
          id: 'halyard-line',
          connection: 'halyard',
          anchors: [
            { id: 'a', ref: { object: 'uniform' } },
            { id: 'b', ref: { object: 'whiskey' } }
          ]
        }
      ]
    }
  ]
};

export const IconPacks = () => {
  const { themeMode } = useExamplesThemeMode();
  const onValidationError = useExamplesValidationError();
  return (
    <Reticulyne
      initialData={hoist}
      iconPacks={iconPacks}
      themeMode={themeMode}
      onValidationError={onValidationError}
    />
  );
};
