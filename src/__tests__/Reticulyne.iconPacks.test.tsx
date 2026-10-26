/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import { render, cleanup, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAIN_MENU_OPTIONS } from 'src/config';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useModelStore } from 'src/stores/modelStore';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { model as fixtureModel } from 'src/fixtures/model';
import type { IconPack } from 'src/icons/pack';
import type { IconPackEntry } from 'src/icons/packRegistry';
import { PACK_LOCKED_MESSAGE } from 'src/icons/packRegistry';
import type { Icon } from 'src/types';
import { emptyScene, type Scene } from 'src/core';
import { MISSING_ICON_URL } from 'src/icons/missing';

// Icon packs pushed in from code: the iconPacks prop and useReticulyne's
// installIconPack / removeIconPack, over the Nautical Flags pack.

const flags: IconPack = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../packs/nautical-flags/nautical-flags.reticulyne-pack.json'
    ),
    'utf8'
  )
);

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => {
            return false;
          }
        };
      }
    });
  }
});

afterEach(() => {
  cleanup();
});

interface Seen {
  api: ReturnType<typeof useReticulyne>;
  icons: Icon[];
  categories: (string | undefined)[];
  addItemWithIcon: (icon: string) => void;
  undo: () => void;
  isDirty: boolean;
}

const Probe = ({ onSeen }: { onSeen: (seen: Seen) => void }) => {
  const api = useReticulyne();
  const icons = useModelStore((state) => {
    return state.icons;
  });
  const categories = useUiStateStore((state) => {
    return state.iconCategoriesState;
  });
  const isDirty = useUiStateStore((state) => {
    return state.saveStatus.isDirty;
  });
  const modelActions = useModelStore((state) => {
    return state.actions;
  });
  const { undo } = useScene();
  useEffect(() => {
    onSeen({
      api,
      icons,
      categories: categories.map((c) => {
        return c.id;
      }),
      isDirty,
      undo,
      addItemWithIcon: (icon) => {
        const { items } = modelActions.get();
        modelActions.set({
          items: [...items, { id: 'flag-on-canvas', name: 'Flag', icon }]
        });
      }
    });
  });
  return null;
};

const mount = (props: {
  iconPacks?: IconPackEntry[];
  onIconPackInstall?: (pack: IconPack) => void;
  onIconPackRemove?: (id: string) => void;
  initialData?: Scene;
}) => {
  let seen: Seen | undefined;
  act(() => {
    render(
      <Reticulyne editorMode="EDITABLE" initialData={fixtureModel} {...props}>
        <Probe
          onSeen={(s) => {
            seen = s;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    return seen!;
  };
};

const flagIcons = (icons: Icon[]) => {
  return icons.filter((icon) => {
    return icon.id.startsWith('nautical-flags-');
  });
};

test('a pack passed in code joins the library, under its own section', () => {
  const seen = mount({ iconPacks: [{ pack: flags }] });
  expect(flagIcons(seen().icons)).toHaveLength(40);
  expect(seen().categories).toContain('nautical-flags');
  expect(seen().api.getIconPacks()).toEqual([
    {
      id: 'nautical-flags',
      name: 'Nautical Flags',
      version: '1.0.0',
      sourceUrl: flags.sourceUrl,
      icons: 40,
      origin: 'app',
      removable: true
    }
  ]);
});

test('loading a pack does not count as an unsaved change', () => {
  const seen = mount({ iconPacks: [{ pack: flags }] });
  expect(seen().isDirty).toBe(false);
});

test('a removable app pack can be removed; its icons and section go', () => {
  const onIconPackRemove = jest.fn();
  const seen = mount({ iconPacks: [{ pack: flags }], onIconPackRemove });
  let result;
  act(() => {
    result = seen().api.removeIconPack('nautical-flags');
  });
  expect(result).toEqual({ ok: true });
  expect(flagIcons(seen().icons)).toHaveLength(0);
  expect(seen().categories).not.toContain('nautical-flags');
  expect(seen().api.getIconPacks()).toEqual([]);
  // A removal the app makes is not reported back to it.
  expect(onIconPackRemove).not.toHaveBeenCalled();
});

test('a locked pack is neither removed nor installed over', () => {
  const seen = mount({ iconPacks: [{ pack: flags, removable: false }] });
  let removal;
  let install;
  act(() => {
    removal = seen().api.removeIconPack('nautical-flags');
    install = seen().api.installIconPack({ ...flags, version: '2.0.0' });
  });
  expect(removal).toEqual({ ok: false, errors: [PACK_LOCKED_MESSAGE] });
  expect(install).toEqual({ ok: false, errors: [PACK_LOCKED_MESSAGE] });
  expect(seen().api.getIconPacks()[0]).toMatchObject({
    version: '1.0.0',
    removable: false
  });
  expect(flagIcons(seen().icons)).toHaveLength(40);
});

test('an install from code replaces an earlier pack of the id, last wins', () => {
  const onIconPackInstall = jest.fn();
  const seen = mount({ iconPacks: [{ pack: flags }], onIconPackInstall });
  const redrawn: IconPack = {
    ...flags,
    version: '2.0.0',
    icons: flags.icons.slice(0, 2)
  };
  act(() => {
    seen().api.installIconPack(redrawn, { removable: false });
  });
  expect(seen().api.getIconPacks()).toEqual([
    expect.objectContaining({
      version: '2.0.0',
      origin: 'app',
      removable: false,
      icons: 2
    })
  ]);
  expect(flagIcons(seen().icons)).toHaveLength(2);
  // An install the app makes is not reported back to it as the user's.
  expect(onIconPackInstall).not.toHaveBeenCalled();
});

test('an invalid pack is refused with its errors and changes nothing', () => {
  const seen = mount({});
  let result;
  act(() => {
    result = seen().api.installIconPack({ ...flags, sourceUrl: '' });
  });
  expect(result).toMatchObject({ ok: false });
  expect(flagIcons(seen().icons)).toHaveLength(0);
});

test('a removed pack keeps the icons objects on the canvas still use', () => {
  const seen = mount({});
  act(() => {
    seen().api.installIconPack(flags);
  });
  act(() => {
    seen().addItemWithIcon('nautical-flags-alfa');
  });
  act(() => {
    seen().api.removeIconPack('nautical-flags');
  });
  expect(
    flagIcons(seen().icons).map((icon) => {
      return icon.id;
    })
  ).toEqual(['nautical-flags-alfa']);
});

describe('the Icon packs menu entry', () => {
  const menuHas = async (props: Record<string, unknown>) => {
    act(() => {
      render(<Reticulyne initialData={fixtureModel} {...props} />);
    });
    // A read-only editor has no main menu at all.
    const menu = screen.queryByRole('button', { name: /main menu/i });
    if (!menu) return false;
    await act(async () => {
      await userEvent.click(menu);
    });
    return screen.queryByText('Icon packs') !== null;
  };

  test('is in the menu by default when the diagram is editable', async () => {
    expect(await menuHas({ editorMode: 'EDITABLE' })).toBe(true);
  });

  test('is left out when the host leaves ACTION.ICON_PACKS out', async () => {
    expect(
      await menuHas({
        editorMode: 'EDITABLE',
        mainMenuOptions: MAIN_MENU_OPTIONS.filter((o) => {
          return o !== 'ACTION.ICON_PACKS';
        })
      })
    ).toBe(false);
  });

  test('is not offered on a read-only diagram', async () => {
    expect(await menuHas({ editorMode: 'EXPLORABLE_READONLY' })).toBe(false);
  });
});

describe('opening a diagram drawn with a pack', () => {
  // Saved with the flags pack loaded: it lists the pack and carries its own
  // copies of Alfa and Zulu; a third object names an icon nobody has.
  const shared = (): Scene => {
    const base = emptyScene('shared', 'Regatta');
    const copy = (i: number) => {
      const icon = flags.icons[i];
      return {
        id: icon.id,
        name: icon.name,
        url: icon.url,
        isIsometric: true,
        flatUrl: icon.flatUrl
      };
    };
    return {
      ...base,
      objects: [
        { id: 'a', name: 'Alfa', icon: 'nautical-flags-alfa' },
        { id: 'z', name: 'Zulu', icon: 'nautical-flags-zulu' },
        { id: 'q', name: 'Lost', icon: 'gone-icon' },
        { id: 'q2', name: 'Lost too', icon: 'gone-icon' }
      ],
      icons: [copy(0), copy(25)],
      externalPacks: [
        {
          id: 'nautical-flags',
          name: 'Nautical Flags',
          version: '1.0.0',
          sourceUrl: flags.sourceUrl,
          icons: ['nautical-flags-alfa', 'nautical-flags-zulu']
        }
      ],
      connections: [{ id: 'c1', from: 'a', to: 'q' }],
      views: [
        {
          id: 'v',
          kind: 'iso' as const,
          name: 'Main',
          placements: ['a', 'z', 'q', 'q2'].map((object, i) => {
            return { object, tile: { x: i * 2, y: 0 } };
          })
        }
      ]
    };
  };

  test('without the pack: names it with its source, and lists the missing icon', () => {
    mount({ initialData: shared() });
    const notice = screen.getByTestId('open-notice').textContent ?? '';
    expect(notice).toContain('Nautical Flags 1.0.0, from');
    expect(notice).toContain(flags.sourceUrl);
    expect(notice).toContain('gone-icon (2 objects)');
  });

  test('with the pack at another version: says which', () => {
    mount({
      initialData: shared(),
      iconPacks: [{ pack: { ...flags, version: '2.0.0' } }]
    });
    expect(screen.getByTestId('open-notice').textContent).toContain(
      'Nautical Flags: the diagram was drawn with 1.0.0; 2.0.0 is installed.'
    );
  });

  test('installing the pack takes its line away; the diagram keeps its copies', () => {
    const seen = mount({ initialData: shared() });
    act(() => {
      seen().api.installIconPack(flags);
    });
    const notice = screen.getByTestId('open-notice').textContent ?? '';
    expect(notice).not.toContain('Nautical Flags 1.0.0, from');
    expect(notice).toContain('gone-icon');
  });

  test('Replace swaps the missing icon on every object in one undo step, connections kept', async () => {
    const seen = mount({ initialData: shared() });
    const placeholder = seen().icons.find((i) => {
      return i.id === 'gone-icon';
    });
    expect(placeholder?.url).toBe(MISSING_ICON_URL);
    await act(async () => {
      await userEvent.click(
        screen.getByRole('button', { name: 'Replace gone-icon' })
      );
    });
    await act(async () => {
      await userEvent.type(screen.getByLabelText('Search icons'), 'Zulu');
    });
    const choices = screen.getByTestId('replace-icon-choices');
    await act(async () => {
      await userEvent.click(choices.querySelector('img')!);
    });
    const scene = seen().api.getScene();
    expect(
      scene.objects
        .filter((o) => {
          return o.id === 'q' || o.id === 'q2';
        })
        .map((o) => {
          return o.icon;
        })
    ).toEqual(['nautical-flags-zulu', 'nautical-flags-zulu']);
    expect(scene.connections).toEqual([
      expect.objectContaining({ id: 'c1', from: 'a', to: 'q' })
    ]);
    expect(screen.getByTestId('open-notice').textContent).not.toContain(
      'gone-icon'
    );
    // One undo brings both back.
    act(() => {
      seen().undo();
    });
    expect(
      seen()
        .api.getScene()
        .objects.filter((o) => {
          return o.icon === 'gone-icon';
        })
    ).toHaveLength(2);
  });

  test('a save lists the pack once; a diagram with no pack icons lists none', () => {
    const seen = mount({ initialData: shared(), iconPacks: [{ pack: flags }] });
    expect(seen().api.getScene().externalPacks).toEqual([
      expect.objectContaining({
        id: 'nautical-flags',
        icons: ['nautical-flags-alfa', 'nautical-flags-zulu']
      })
    ]);
    cleanup();
    const plain = mount({});
    expect(plain().api.getScene()).not.toHaveProperty('externalPacks');
  });
});
