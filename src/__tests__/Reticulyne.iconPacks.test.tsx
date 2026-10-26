/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useModelStore } from 'src/stores/modelStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { model as fixtureModel } from 'src/fixtures/model';
import type { IconPack } from 'src/icons/pack';
import type { IconPackEntry } from 'src/icons/packRegistry';
import { PACK_LOCKED_MESSAGE } from 'src/icons/packRegistry';
import type { Icon } from 'src/types';

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
  useEffect(() => {
    onSeen({
      api,
      icons,
      categories: categories.map((c) => {
        return c.id;
      }),
      isDirty,
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
  expect(onIconPackRemove).toHaveBeenCalledWith('nautical-flags');
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
