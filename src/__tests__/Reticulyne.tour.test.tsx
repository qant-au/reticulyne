/**
 * @jest-environment jsdom
 */
import { useEffect } from 'react';
import {
  render,
  cleanup,
  act,
  screen,
  fireEvent
} from '@testing-library/react';
import Reticulyne, { useReticulyne } from '../Reticulyne';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { model as fixtureModel } from 'src/fixtures/model';
import { getTilePosition } from 'src/utils';
import { MAX_ZOOM, TOUR_ZOOM } from 'src/config';
import { tourKeyAction } from 'src/interaction/tourKeys';
import type { InitialData, TourStep, UiStateActions } from 'src/types';

// Presentation / tour mode, driven through a mounted <Reticulyne>
// as a host would, and through the keys and panel as a viewer would.

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
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

type Api = ReturnType<typeof useReticulyne> & { ui: UiStateActions };

const Probe = ({ onReady }: { onReady: (api: Api) => void }) => {
  const api = useReticulyne();
  const ui = useUiStateStore((state) => {
    return state.actions;
  });
  useEffect(() => {
    onReady({ ...api, ui });
  }, [api, ui, onReady]);
  return null;
};

const mount = (
  props: Partial<Parameters<typeof Reticulyne>[0]> = {}
): (() => Api) => {
  let captured: Api | null = null;
  act(() => {
    render(
      <Reticulyne initialData={fixtureModel as InitialData} {...props}>
        <Probe
          onReady={(api) => {
            captured = api;
          }}
        />
      </Reticulyne>
    );
  });
  return () => {
    if (!captured) throw new Error('probe did not mount');
    return captured;
  };
};

const STEPS: TourStep[] = [
  { nodeId: 'node2', narration: '<p>The <strong>second</strong> node.</p>' },
  { nodeId: 'node1', title: 'Start here', zoom: 5 },
  { nodeId: 'node3' }
];

const press = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...init })
    );
  });
};

describe('tour', () => {
  test('startTour centres the first node at the tour zoom and highlights it', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    let started = false;
    act(() => {
      started = api().startTour(STEPS);
    });
    expect(started).toBe(true);
    expect(api().getTourState()).toEqual({
      index: 0,
      total: 3,
      step: STEPS[0]
    });
    const p = getTilePosition({ tile: { x: 0, y: 4 } });
    const vp = api().getViewport();
    expect(vp.zoom).toBe(TOUR_ZOOM);
    expect(vp.scroll.x).toBeCloseTo(-p.x * TOUR_ZOOM);
    expect(vp.scroll.y).toBeCloseTo(-p.y * TOUR_ZOOM);
    expect(api().ui.get().highlightedItemId).toBe('node2');
  });

  test('the panel shows the step, the node name and the narration', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().startTour(STEPS);
    });
    const panel = screen.getByTestId('tour-panel');
    expect(panel.textContent).toContain('Step 1 of 3');
    expect(panel.textContent).toContain('Node2');
    expect(panel.querySelector('strong')?.textContent).toBe('second');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(panel.textContent).toContain('Step 2 of 3');
    // A step's title wins over the node name; the node's description is
    // the narration when the step has none.
    expect(panel.textContent).toContain('Start here');
    expect(panel.textContent).toContain('Node1Description');
    expect(api().getViewport().zoom).toBe(MAX_ZOOM);
  });

  test('next, previous and goTo stay in range', () => {
    const api = mount();
    act(() => {
      api().startTour(STEPS);
      api().previousTourStep();
    });
    expect(api().getTourState()?.index).toBe(0);
    act(() => {
      api().goToTourStep(2);
      api().nextTourStep();
    });
    expect(api().getTourState()?.index).toBe(2);
    act(() => {
      api().goToTourStep(7);
      api().goToTourStep(-1);
    });
    expect(api().getTourState()?.index).toBe(2);
  });

  test('onTourStepChange hears each step and the end; the host highlight comes back', () => {
    const onTourStepChange = jest.fn();
    const api = mount({ onTourStepChange, highlightedItemId: 'node3' });
    act(() => {
      api().startTour(STEPS);
      api().nextTourStep();
      api().endTour();
    });
    expect(
      onTourStepChange.mock.calls.map(([s]) => {
        return s?.index ?? null;
      })
    ).toEqual([0, 1, null]);
    expect(api().getTourState()).toBeNull();
    expect(api().ui.get().highlightedItemId).toBe('node3');
    expect(screen.queryByTestId('tour-panel')).toBeNull();
  });

  test('with no steps it walks every node on the view in reading order', () => {
    const api = mount();
    act(() => {
      api().startTour();
    });
    const order = ['node1', 'node2', 'node3']
      .map((id, i) => {
        const tile = [
          { x: 0, y: 0 },
          { x: 0, y: 4 },
          { x: 0, y: -4 }
        ][i];
        return { id, at: getTilePosition({ tile }) };
      })
      .sort((a, b) => {
        return a.at.y - b.at.y || a.at.x - b.at.x;
      })
      .map(({ id }) => {
        return id;
      });
    const seen: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      seen.push(api().getTourState()!.step.nodeId);
      act(() => {
        api().nextTourStep();
      });
    }
    expect(seen).toEqual(order);
  });

  test('invalid steps are refused through onValidationError', () => {
    const onValidationError = jest.fn();
    const api = mount({ onValidationError });
    let started = true;
    act(() => {
      started = api().startTour([
        { nodeId: 'node1', narration: 'x'.repeat(1001) }
      ]);
    });
    expect(started).toBe(false);
    expect(onValidationError).toHaveBeenCalled();
    expect(api().getTourState()).toBeNull();
  });

  test('a step whose node is on no view is skipped', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const api = mount();
    act(() => {
      api().startTour([{ nodeId: 'gone' }, { nodeId: 'node1' }]);
    });
    expect(api().getTourState()).toMatchObject({
      total: 1,
      step: { nodeId: 'node1' }
    });
    act(() => {
      api().endTour();
    });
    let started = true;
    act(() => {
      started = api().startTour([{ nodeId: 'gone' }]);
    });
    expect(started).toBe(false);
    warn.mockRestore();
  });

  test('a step on another view switches to it', () => {
    const twoViews = {
      ...fixtureModel,
      views: [
        ...fixtureModel.views,
        {
          id: 'view2',
          name: 'Upstairs',
          items: [{ id: 'node2', tile: { x: 3, y: 3 } }]
        }
      ]
    };
    const api = mount({ initialData: twoViews as InitialData });
    act(() => {
      api().startTour([
        { nodeId: 'node1' },
        { nodeId: 'node2', viewId: 'view2' }
      ]);
    });
    expect(api().getViewport().viewId).toBe('view1');
    act(() => {
      api().nextTourStep();
    });
    expect(api().getViewport().viewId).toBe('view2');
    const p = getTilePosition({ tile: { x: 3, y: 3 } });
    expect(api().getViewport().scroll.x).toBeCloseTo(-p.x * TOUR_ZOOM);
  });

  test('arrow keys step the tour and Escape ends it', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().startTour(STEPS);
    });
    press('ArrowRight');
    expect(api().getTourState()?.index).toBe(1);
    press('End');
    expect(api().getTourState()?.index).toBe(2);
    press('ArrowLeft');
    expect(api().getTourState()?.index).toBe(1);
    press('Home');
    expect(api().getTourState()?.index).toBe(0);
    press('Escape');
    expect(api().getTourState()).toBeNull();
  });

  test('in EDITABLE the arrows step the tour instead of nudging', () => {
    const api = mount({ editorMode: 'EDITABLE' });
    act(() => {
      api().select('node1');
      api().startTour(STEPS);
    });
    press('ArrowRight');
    expect(api().getTourState()?.index).toBe(1);
    expect(api().getNode('node1')?.tile).toEqual({ x: 0, y: 0 });
  });

  test('NON_INTERACTIVE shows the narration but leaves the stepping to the host', () => {
    const api = mount({ editorMode: 'NON_INTERACTIVE' });
    act(() => {
      api().startTour(STEPS);
    });
    expect(screen.getByTestId('tour-panel').textContent).toContain('Node2');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    press('ArrowRight');
    expect(api().getTourState()?.index).toBe(0);
    act(() => {
      api().nextTourStep();
    });
    expect(api().getTourState()?.index).toBe(1);
  });

  test('the tour prop offers a Start tour button', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY', tour: STEPS });
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(api().getTourState()?.step.nodeId).toBe('node2');
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'End tour' }));
    expect(api().getTourState()).toBeNull();
    expect(screen.getByRole('button', { name: 'Start tour' })).toBeTruthy();
  });

  // Sweep 2026-09-30: Start tour came after the canvas in the DOM, so Tab
  // walked every object (74 presses in the read-only example) to reach it.
  test('Start tour comes before the canvas in tab order', () => {
    mount({ editorMode: 'EXPLORABLE_READONLY', tour: STEPS });
    const start = screen.getByRole('button', { name: 'Start tour' });
    const canvas = screen.getByLabelText('Diagram canvas');
    expect(
      start.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('keyboard focus follows the tour instead of falling to the page', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY', tour: STEPS });
    const clickFocused = (name: string) => {
      const button = screen.getByRole('button', { name });
      act(() => {
        button.focus();
      });
      fireEvent.click(button);
    };
    clickFocused('Start tour');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Next' })
    );
    act(() => {
      api().goToTourStep(2);
    });
    clickFocused('Finish');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Start tour' })
    );
    clickFocused('Start tour');
    clickFocused('End tour');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Start tour' })
    );
    clickFocused('Start tour');
    press('Escape');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Start tour' })
    );
  });

  test('a tour the host starts does not take focus', () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    act(() => {
      api().startTour(STEPS);
    });
    expect(document.activeElement).toBe(document.body);
    act(() => {
      api().endTour();
    });
    expect(document.activeElement).toBe(document.body);
  });

  // Sweep 2026-09-30, round 3: at 390 Step 1 left the node's description
  // collapsed to two lines. A step shows its node's label expanded; the
  // label collapses again when the step moves on.
  test("a step shows its node's label expanded, and only for that step", () => {
    const api = mount({ editorMode: 'EXPLORABLE_READONLY' });
    const collapsed = (id: string) => {
      const label = document.querySelector(`[data-node-label="${id}"]`);
      if (!label) throw new Error(`no label for ${id}`);
      return [...label.querySelectorAll<HTMLElement>('*')].some((el) => {
        return el.style.maxHeight === '80px';
      });
    };
    expect(collapsed('node2')).toBe(true);
    act(() => {
      api().startTour(STEPS);
    });
    expect(collapsed('node2')).toBe(false);
    expect(collapsed('node1')).toBe(true);
    act(() => {
      api().nextTourStep();
    });
    expect(collapsed('node2')).toBe(true);
    expect(collapsed('node1')).toBe(false);
    act(() => {
      api().endTour();
    });
    expect(collapsed('node1')).toBe(true);
  });

  test('no tour prop, no button', () => {
    mount({ editorMode: 'EXPLORABLE_READONLY' });
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull();
  });
});

describe('tourKeyAction', () => {
  test('maps the presentation keys and leaves chords alone', () => {
    const k = (key: string, init: KeyboardEventInit = {}) => {
      return tourKeyAction(new KeyboardEvent('keydown', { key, ...init }));
    };
    expect(k('ArrowRight')).toBe('next');
    expect(k('PageDown')).toBe('next');
    expect(k('ArrowUp')).toBe('previous');
    expect(k('Home')).toBe('first');
    expect(k('End')).toBe('last');
    expect(k('Escape')).toBe('end');
    expect(k(' ')).toBeNull();
    expect(k('ArrowUp', { altKey: true })).toBeNull();
  });
});
