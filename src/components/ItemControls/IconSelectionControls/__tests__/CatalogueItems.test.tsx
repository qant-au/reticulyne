/**
 * @jest-environment jsdom
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { ModelProvider } from 'src/stores/modelStore';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import type { CatalogueItem } from 'src/catalogue/schema';
import { CatalogueItems } from '../CatalogueItems';

// A host's catalogue items (an icon pack's devices) join the palette after
// the built-in ones; one that reuses a built-in id is left out.

afterEach(() => {
  cleanup();
});

const packItem: CatalogueItem = {
  id: 'pack-sat-hotspot',
  name: 'Pack Satellite Hotspot',
  family: 'marine-vehicle',
  icon: 'pack-sat-hotspot',
  ports: [{ id: 'sat', medium: 'satellite', role: 'client' }]
};
const clash: CatalogueItem = {
  id: 'router',
  name: 'Pack Router That Clashes',
  family: 'ethernet',
  ports: [{ id: 'eth1', medium: 'ethernet-copper' }]
};

const Seed = ({ items }: { items: CatalogueItem[] }) => {
  const actions = useUiStateStore((state) => {
    return state.actions;
  });
  actions.setCatalogueItems(items);
  return null;
};

const renderWith = (filter: string) => {
  act(() => {
    render(
      <ModelProvider>
        <UiStateProvider>
          <Seed items={[packItem, clash]} />
          <CatalogueItems
            filter={filter}
            onMouseDown={() => {}}
            onClick={() => {}}
          />
        </UiStateProvider>
      </ModelProvider>
    );
  });
};

// The search shows matches in one grid, whatever their section.
test('the palette lists a host item', () => {
  renderWith('pack satellite');
  expect(screen.getByText('Pack Satellite Hotspot')).toBeTruthy();
});

test('a host item never replaces a built-in one', () => {
  renderWith('router');
  expect(screen.queryByText('Pack Router That Clashes')).toBeNull();
  expect(screen.getByText('Router')).toBeTruthy();
});
