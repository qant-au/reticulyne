/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from 'src/styles/theme';
import { ModelProvider, useModelStore } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { HistoryProvider } from 'src/stores/historyStore';
import type { IconPack } from 'src/icons/pack';
import type { IconPackEntry, IconPackHandlers } from 'src/icons/packRegistry';
import type { UiStateActions } from 'src/types';
import { IconPacksDialog } from '../IconPacksDialog';

// The Icon packs dialog over the Nautical Flags pack: installing from a
// file, replacing, refusing, removing, and the refusal while a pack is in
// use, with and without the host's callbacks.

const flags: IconPack = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../../packs/nautical-flags/nautical-flags.reticulyne-pack.json'
    ),
    'utf8'
  )
);

afterEach(() => {
  cleanup();
});

let actions: UiStateActions;

const Setup = ({
  hostPacks,
  handlers,
  items
}: {
  hostPacks: IconPackEntry[];
  handlers: IconPackHandlers;
  items: { id: string; name: string; icon: string; placed?: boolean }[];
}) => {
  const ui = useUiStateStore((state) => {
    return state.actions;
  });
  const model = useModelStore((state) => {
    return state.actions;
  });
  useEffect(() => {
    actions = ui;
    ui.setHostPacks(hostPacks);
    ui.setPackHandlers(handlers);
    model.set({
      title: 'Harbour',
      items: items.map(({ placed, ...item }) => {
        void placed;
        return item;
      }),
      views: [
        {
          id: 'v',
          name: 'Main',
          items: items
            .filter((i) => {
              return i.placed !== false;
            })
            .map((i) => {
              return { id: i.id, tile: { x: 0, y: 0 } };
            })
        }
      ]
    });
    ui.setView('v');
  }, [ui, model, hostPacks, handlers, items]);
  return <IconPacksDialog onClose={() => {}} />;
};

const mount = ({
  hostPacks = [],
  handlers = {},
  items = []
}: {
  hostPacks?: IconPackEntry[];
  handlers?: IconPackHandlers;
  items?: { id: string; name: string; icon: string; placed?: boolean }[];
}) => {
  render(
    <ThemeProvider theme={theme}>
      <ModelProvider>
        <SceneProvider>
          <UiStateProvider>
            <HistoryProvider>
              <Setup hostPacks={hostPacks} handlers={handlers} items={items} />
            </HistoryProvider>
          </UiStateProvider>
        </SceneProvider>
      </ModelProvider>
    </ThemeProvider>
  );
};

const choose = async (value: unknown, name = 'flags.json') => {
  const file = new File([JSON.stringify(value)], name, {
    type: 'application/json'
  });
  await act(async () => {
    fireEvent.change(screen.getByTestId('icon-pack-file-input'), {
      target: { files: [file] }
    });
  });
};

test('lists nothing to begin with and says how to install', () => {
  mount({});
  expect(screen.getByText(/No icon packs are installed/)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Install from file…' })
  ).toBeTruthy();
});

test('installs a pack from a file and hands it to the host to keep', async () => {
  const onIconPackInstall = jest.fn();
  mount({ handlers: { onIconPackInstall } });
  await choose(flags);
  expect(
    await screen.findByText('Installed Nautical Flags 1.0.0: 40 icons.')
  ).toBeTruthy();
  const row = screen.getByTestId('icon-pack-nautical-flags');
  expect(row.textContent).toContain('Installed by you');
  expect(row.textContent).toContain('40 icons');
  expect(
    screen.getByRole('link', { name: flags.sourceUrl }).getAttribute('target')
  ).toBe('_blank');
  expect(onIconPackInstall).toHaveBeenCalledWith(flags);
});

test('without a host to keep it, the install still loads for the session', async () => {
  mount({});
  await choose(flags);
  await waitFor(() => {
    expect(actions.get().packs).toHaveLength(1);
  });
});

test('a host that fails to keep it says so, and the pack stays loaded', async () => {
  mount({
    handlers: {
      onIconPackInstall: () => {
        return Promise.reject(new Error('Browser storage is full.'));
      }
    }
  });
  await choose(flags);
  await waitFor(() => {
    expect(
      screen.getByText(
        /installed for now but was not kept: Browser storage is full/
      )
    ).toBeTruthy();
  });
  expect(actions.get().packs).toHaveLength(1);
});

test('a broken file lists every problem and installs nothing', async () => {
  mount({});
  const broken = {
    ...flags,
    sourceUrl: '',
    icons: [{ ...flags.icons[0], flatUrl: 'javascript:alert(1)' }]
  };
  await choose(broken);
  expect(await screen.findByText('The pack has 2 problems:')).toBeTruthy();
  expect(screen.getByText(/^sourceUrl/)).toBeTruthy();
  expect(screen.getByText(/^icons\.0\.flatUrl/)).toBeTruthy();
  expect(actions.get().packs).toHaveLength(0);
});

test('a file that is not JSON says so', async () => {
  mount({});
  const file = new File(['not json'], 'notes.json');
  await act(async () => {
    fireEvent.change(screen.getByTestId('icon-pack-file-input'), {
      target: { files: [file] }
    });
  });
  expect(
    await screen.findByText('“notes.json” is not a JSON file.')
  ).toBeTruthy();
});

test('installing a newer version asks first, naming both, then replaces', async () => {
  mount({ hostPacks: [{ pack: flags, origin: 'user' }] });
  await choose({ ...flags, version: '2.0.0' });
  expect(
    await screen.findByText(
      /Replace Nautical Flags 1\.0\.0 with Nautical Flags 2\.0\.0\?/
    )
  ).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
  });
  expect(actions.get().packs[0].pack.version).toBe('2.0.0');
});

test('installing over a locked pack is refused, and it has no Remove', async () => {
  mount({ hostPacks: [{ pack: flags, removable: false }] });
  const row = screen.getByTestId('icon-pack-nautical-flags');
  expect(row.textContent).toContain('Loaded by the app');
  expect(row.textContent).toContain('Locked by the app');
  expect(
    screen.queryByRole('button', { name: 'Remove Nautical Flags' })
  ).toBeNull();
  await choose({ ...flags, version: '2.0.0' });
  expect(
    await screen.findByText(/loaded by the app and can't be replaced/)
  ).toBeTruthy();
  expect(actions.get().packs[0].pack.version).toBe('1.0.0');
});

test('a pack no diagram uses is removed after a confirm', async () => {
  const onIconPackRemove = jest.fn();
  const iconPackUsage = jest.fn(() => {
    return [];
  });
  mount({
    hostPacks: [{ pack: flags, origin: 'user' }],
    handlers: { onIconPackRemove, iconPackUsage }
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Nautical Flags' })
    );
  });
  expect(iconPackUsage).toHaveBeenCalledWith(
    'nautical-flags',
    expect.arrayContaining(['nautical-flags-alfa'])
  );
  expect(
    screen.getByText(/Its 40 icons and its devices leave the library/)
  ).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  });
  expect(actions.get().packs).toHaveLength(0);
  expect(onIconPackRemove).toHaveBeenCalledWith('nautical-flags');
  expect(screen.getByText('Removed Nautical Flags 1.0.0.')).toBeTruthy();
});

test('removal is refused while diagrams use the pack, and lists them', async () => {
  const onShowIconPackUsage = jest.fn();
  mount({
    hostPacks: [{ pack: flags, origin: 'user' }],
    items: [
      { id: 'f1', name: 'Alfa on the mast', icon: 'nautical-flags-alfa' }
    ],
    handlers: {
      iconPackUsage: async () => {
        return [
          {
            diagramId: 'd2',
            diagramName: 'Regatta',
            objects: [{ id: 'z', name: 'Zulu' }]
          }
        ];
      },
      onShowIconPackUsage
    }
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Nautical Flags' })
    );
  });
  const usage = screen.getByTestId('icon-pack-usage');
  expect(usage.textContent).toContain("can't be removed while diagrams use");
  expect(usage.textContent).toContain('Harbour (open now)');
  expect(usage.textContent).toContain('Alfa on the mast');
  expect(usage.textContent).toContain('Regatta');
  expect(usage.textContent).toContain('Zulu');
  expect(actions.get().packs).toHaveLength(1);

  // Show on the open diagram selects its objects.
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Show the objects in Harbour (open now)'
    })
  );
  expect(actions.get().selection).toEqual([{ type: 'ITEM', id: 'f1' }]);
});

test('Show on another diagram asks the host to open it', async () => {
  const onShowIconPackUsage = jest.fn();
  mount({
    hostPacks: [{ pack: flags, origin: 'user' }],
    handlers: {
      iconPackUsage: () => {
        return [
          {
            diagramId: 'd2',
            diagramName: 'Regatta',
            objects: [{ id: 'z', name: 'Zulu' }]
          }
        ];
      },
      onShowIconPackUsage
    }
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Nautical Flags' })
    );
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Show the objects in Regatta' })
  );
  expect(onShowIconPackUsage).toHaveBeenCalledWith('d2', ['z']);
});

test('with no host usage check, only the open diagram is checked, and Show is offered only there', async () => {
  mount({
    hostPacks: [{ pack: flags }],
    items: [{ id: 'f1', name: 'Alfa', icon: 'nautical-flags-alfa' }]
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Nautical Flags' })
    );
  });
  expect(screen.getByText('Harbour (open now)')).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: /^Show the objects/ })
  ).toHaveLength(1);
});

test('an object on no view does not hold the pack: it cannot be seen or deleted', async () => {
  mount({
    hostPacks: [{ pack: flags, origin: 'user' }],
    items: [
      { id: 'f1', name: 'Alfa', icon: 'nautical-flags-alfa', placed: false }
    ]
  });
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Nautical Flags' })
    );
  });
  expect(
    screen.getByText(/Its 40 icons and its devices leave the library/)
  ).toBeTruthy();
});
