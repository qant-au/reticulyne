/**
 * @jest-environment jsdom
 */
import { render, act, cleanup } from '@testing-library/react';
import { UiStateProvider, useUiStateStore } from '../uiStateStore';
import type { ItemReference, UiStateStore } from 'src/types';

afterEach(() => {
  cleanup();
});

const a: ItemReference = { type: 'ITEM', id: 'a' };
const b: ItemReference = { type: 'RECTANGLE', id: 'b' };
const c: ItemReference = { type: 'TEXTBOX', id: 'c' };

// Two different items that share an id — the store must key on type+id,
// not id alone, or selecting one would deselect the other.
const nodeX: ItemReference = { type: 'ITEM', id: 'x' };
const rectX: ItemReference = { type: 'RECTANGLE', id: 'x' };

const mount = () => {
  let store!: UiStateStore;

  const Probe = () => {
    store = useUiStateStore((s) => {
      return s;
    });
    return null;
  };

  render(
    <UiStateProvider>
      <Probe />
    </UiStateProvider>
  );

  return {
    get state() {
      return store;
    },
    act: (fn: (actions: UiStateStore['actions']) => void) => {
      act(() => {
        fn(store.actions);
      });
    }
  };
};

// 1.4 invariant (see the `Selection` doc comment in src/types/internal.ts):
//   selection.length === 0  ->  itemControls is null or ADD_ITEM
//   selection.length >= 1   ->  itemControls === selection[last]
const expectInvariant = (state: UiStateStore) => {
  if (state.selection.length === 0) {
    expect(
      state.itemControls === null || state.itemControls.type === 'ADD_ITEM'
    ).toBe(true);
    return;
  }
  expect(state.itemControls).toEqual(
    state.selection[state.selection.length - 1]
  );
};

describe('uiStateStore selection <-> itemControls', () => {
  test('setItemControls with a reference produces a one-item selection', () => {
    const s = mount();
    s.act((actions) => {
      actions.setItemControls(a);
    });

    expect(s.state.selection).toEqual([a]);
    expectInvariant(s.state);
  });

  test('setItemControls(null) empties the selection', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b]);
    });
    s.act((actions) => {
      actions.setItemControls(null);
    });

    expect(s.state.selection).toEqual([]);
    expectInvariant(s.state);
  });

  test('ADD_ITEM is not a selection', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b]);
    });
    s.act((actions) => {
      actions.setItemControls({ type: 'ADD_ITEM' });
    });

    expect(s.state.selection).toEqual([]);
    expectInvariant(s.state);
  });

  test('setSelection points itemControls at the last member', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b, c]);
    });

    expect(s.state.selection).toEqual([a, b, c]);
    expect(s.state.itemControls).toEqual(c);
    expectInvariant(s.state);
  });

  test('toggleSelected appends an absent item and makes it the target', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a]);
    });
    s.act((actions) => {
      actions.toggleSelected(b);
    });

    expect(s.state.selection).toEqual([a, b]);
    expect(s.state.itemControls).toEqual(b);
  });

  test('toggleSelected removes a present item', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b, c]);
    });
    s.act((actions) => {
      actions.toggleSelected(b);
    });

    expect(s.state.selection).toEqual([a, c]);
    expectInvariant(s.state);
  });

  test('toggling the last member out leaves nothing selected', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a]);
    });
    s.act((actions) => {
      actions.toggleSelected(a);
    });

    expect(s.state.selection).toEqual([]);
    expect(s.state.itemControls).toBeNull();
  });

  test('selection is keyed on type AND id, not id alone', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([nodeX]);
    });
    s.act((actions) => {
      actions.toggleSelected(rectX);
    });

    expect(s.state.selection).toEqual([nodeX, rectX]);
  });

  test('clearSelection empties both halves', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b]);
    });
    s.act((actions) => {
      actions.clearSelection();
    });

    expect(s.state.selection).toEqual([]);
    expect(s.state.itemControls).toBeNull();
  });

  test('opening the main menu drops the selection', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b]);
    });
    s.act((actions) => {
      actions.setIsMainMenuOpen(true);
    });

    expect(s.state.selection).toEqual([]);
    expectInvariant(s.state);
  });

  test('resetUiState drops the selection', () => {
    const s = mount();
    s.act((actions) => {
      actions.setSelection([a, b]);
    });
    s.act((actions) => {
      actions.resetUiState();
    });

    expect(s.state.selection).toEqual([]);
    expectInvariant(s.state);
  });
});
