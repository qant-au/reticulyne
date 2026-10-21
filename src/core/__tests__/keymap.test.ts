// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see below
// @ts-nocheck: ported as-is from untyped JavaScript tests; the fixtures
// are deliberately loose literals (the schema is what checks them).
import { strict as assert } from 'node:assert';
import {
  DIFFERENCES,
  EXCALIDRAW_BINDINGS,
  formatBinding,
  formatDifferences,
  formatChord,
  isTypingTarget,
  keymapFor,
  matchChord,
  resolveAction,
  shortcutHint,
  shortcutSections
} from 'src/core';

const ev = (key, code = '', mods = {}) => {
  return {
    key,
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mods
  };
};

const reticulyne = keymapFor();
const plain = keymapFor();

test('tool letters and the number row', () => {
  assert.equal(resolveAction(ev('v', 'KeyV'), plain), 'select');
  assert.equal(resolveAction(ev('V', 'KeyV'), plain), 'select', 'caps lock');
  assert.equal(resolveAction(ev('1', 'Digit1'), plain), 'select');
  assert.equal(resolveAction(ev('a', 'KeyA'), reticulyne), 'connector');
  assert.equal(resolveAction(ev('c', 'KeyC'), reticulyne), 'connector');
  assert.equal(
    resolveAction(ev('s', 'KeyS'), reticulyne),
    'select',
    'alias joins the shared row'
  );
  assert.equal(resolveAction(ev('f', 'KeyF'), reticulyne), 'fit-all');
});

test('deliberate divergences stay unbound', () => {
  assert.equal(
    resolveAction(ev('e', 'KeyE'), reticulyne),
    null,
    'Reticulyne has no eraser'
  );
  assert.equal(resolveAction(ev('0', 'Digit0'), reticulyne), null);
  assert.equal(resolveAction(ev('l', 'KeyL'), reticulyne), null);
  assert.equal(resolveAction(ev('d', 'KeyD'), reticulyne), null);
});

test('omit leaves a where-built row unbound', () => {
  const map = keymapFor({ omit: ['group', 'keep-tool'] });
  assert.equal(resolveAction(ev('g', 'KeyG', { ctrlKey: true }), map), null);
  assert.equal(resolveAction(ev('q', 'KeyQ'), map), null);
  assert.equal(
    resolveAction(ev('g', 'KeyG', { ctrlKey: true }), plain),
    'group'
  );
});

test('modifiers must match exactly', () => {
  assert.equal(
    resolveAction(ev('v', 'KeyV', { ctrlKey: true }), plain),
    'paste'
  );
  assert.equal(
    resolveAction(ev('v', 'KeyV', { metaKey: true }), plain),
    'paste'
  );
  assert.equal(
    resolveAction(ev('V', 'KeyV', { shiftKey: true }), plain),
    null,
    'Shift+V is flip, unbound'
  );
  assert.equal(resolveAction(ev('ArrowLeft', 'ArrowLeft'), plain), 'nudge');
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { shiftKey: true }), plain),
    'nudge'
  );
  assert.equal(
    resolveAction(
      ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true, shiftKey: true }),
      plain
    ),
    'align-left'
  );
});

test('undo, redo and Ctrl+Y (Ctrl only)', () => {
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { metaKey: true }), plain),
    'undo'
  );
  assert.equal(
    resolveAction(ev('Z', 'KeyZ', { metaKey: true, shiftKey: true }), plain),
    'redo'
  );
  assert.equal(
    resolveAction(ev('y', 'KeyY', { ctrlKey: true }), plain),
    'redo'
  );
  assert.equal(resolveAction(ev('y', 'KeyY', { metaKey: true }), plain), null);
});

test('Alt chords match the physical key', () => {
  // On macOS, Option+Shift+D types a character, not "d".
  assert.equal(
    resolveAction(ev('Î', 'KeyD', { altKey: true, shiftKey: true }), plain),
    'toggle-theme'
  );
  assert.equal(
    resolveAction(ev('ˆ', 'KeyI', { altKey: true }), reticulyne),
    'toggle-highlight'
  );
  assert.equal(
    resolveAction(ev('¬', 'KeyL', { altKey: true }), reticulyne),
    'toggle-labels'
  );
});

test('Alt + Up / Down change floor in Reticulyne; a bare arrow still nudges', () => {
  assert.equal(
    resolveAction(ev('ArrowUp', 'ArrowUp', { altKey: true }), reticulyne),
    'floor-up'
  );
  assert.equal(
    resolveAction(ev('ArrowDown', 'ArrowDown', { altKey: true }), reticulyne),
    'floor-down'
  );
  assert.equal(resolveAction(ev('ArrowUp', 'ArrowUp'), reticulyne), 'nudge');
});

test('keyboard access in Reticulyne: Tab walks objects, Ctrl/Cmd + arrow pans, Shift+F10 opens the menu', () => {
  assert.equal(resolveAction(ev('Tab', 'Tab'), reticulyne), 'next-object');
  assert.equal(
    resolveAction(ev('Tab', 'Tab', { shiftKey: true }), reticulyne),
    'previous-object'
  );
  assert.equal(
    resolveAction(ev('Tab', 'Tab'), reticulyne, { readOnly: true }),
    'next-object'
  );
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true }), reticulyne),
    'pan'
  );
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { metaKey: true }), reticulyne, {
      readOnly: true
    }),
    'pan'
  );
  assert.equal(
    resolveAction(ev('F10', 'F10', { shiftKey: true }), reticulyne),
    'object-menu'
  );
  assert.equal(
    resolveAction(ev('ContextMenu', 'ContextMenu'), reticulyne),
    'object-menu'
  );
  assert.equal(
    resolveAction(ev('F10', 'F10', { shiftKey: true }), reticulyne, {
      readOnly: true
    }),
    null
  );
  assert.equal(formatChord({ key: 'ContextMenu' }, 'other'), 'Menu');
});

test('zoom keys and fit', () => {
  assert.equal(
    resolveAction(ev('=', 'Equal', { ctrlKey: true }), plain),
    'zoom-in'
  );
  assert.equal(
    resolveAction(ev('+', 'Equal', { ctrlKey: true, shiftKey: true }), plain),
    'zoom-in'
  );
  assert.equal(
    resolveAction(ev('-', 'Minus', { metaKey: true }), plain),
    'zoom-out'
  );
  assert.equal(
    resolveAction(ev('0', 'Digit0', { ctrlKey: true }), plain),
    'zoom-reset'
  );
  assert.equal(resolveAction(ev('=', 'Equal'), reticulyne), 'zoom-in');
  assert.equal(
    resolveAction(ev('!', 'Digit1', { shiftKey: true }), plain),
    'fit-all'
  );
  assert.equal(
    resolveAction(ev('@', 'Digit2', { shiftKey: true }), plain),
    'fit-selection'
  );
  assert.equal(
    resolveAction(ev('?', 'Slash', { shiftKey: true }), plain),
    'help'
  );
});

test('both forms of the ordering keys', () => {
  const r = (mods) => {
    return resolveAction(ev(']', 'BracketRight', mods), reticulyne);
  };
  assert.equal(r({ ctrlKey: true }), 'bring-forward');
  assert.equal(r({ ctrlKey: true, shiftKey: true }), 'bring-to-front');
  assert.equal(r({ metaKey: true, altKey: true }), 'bring-to-front');
  assert.equal(
    resolveAction(
      ev('[', 'BracketLeft', { metaKey: true, altKey: true }),
      reticulyne
    ),
    'send-to-back'
  );
});

test('read-only drops editing bindings, keeps viewing ones', () => {
  const ro = { readOnly: true };
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { ctrlKey: true }), plain, ro),
    null
  );
  assert.equal(resolveAction(ev('Delete', 'Delete'), plain, ro), null);
  assert.equal(resolveAction(ev('l', 'KeyL'), plain, ro), null);
  assert.equal(resolveAction(ev('h', 'KeyH'), plain, ro), 'hand');
  assert.equal(resolveAction(ev('v', 'KeyV'), plain, ro), 'select');
  assert.equal(
    resolveAction(ev('f', 'KeyF', { ctrlKey: true }), plain, ro),
    'find'
  );
  assert.equal(
    resolveAction(ev('?', 'Slash', { shiftKey: true }), plain, ro),
    'help'
  );
  assert.equal(
    resolveAction(ev('Î', 'KeyD', { altKey: true, shiftKey: true }), plain, ro),
    'toggle-theme'
  );
});

test('nothing fires while typing', () => {
  const input = { tagName: 'INPUT' };
  assert.equal(isTypingTarget(input), true);
  assert.equal(
    isTypingTarget({ tagName: 'DIV', isContentEditable: true }),
    true
  );
  assert.equal(
    isTypingTarget({
      tagName: 'LI',
      closest: () => {
        return {};
      }
    }),
    true,
    'open menu'
  );
  assert.equal(
    isTypingTarget({
      tagName: 'CANVAS',
      closest: () => {
        return null;
      }
    }),
    false
  );
  assert.equal(isTypingTarget(null), false);
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { ctrlKey: true, target: input }), plain),
    null
  );
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { ctrlKey: true, target: input }), plain, {
      typingGuard: false
    }),
    'undo'
  );
});

test('matchChord: a code chord ignores the character', () => {
  assert.equal(
    matchChord(ev('x', 'KeyG', { ctrlKey: true }), { code: 'KeyG', mod: true }),
    true
  );
});

test('no two bindings share a chord', () => {
  for (const [tool, map] of [
    ['reticulyne', reticulyne],
    ['plain', plain]
  ]) {
    const actions = map.map((b) => {
      return b.action;
    });
    assert.equal(
      new Set(actions).size,
      actions.length,
      `${tool}: action ids are unique`
    );
    const seen = new Map();
    for (const b of map) {
      for (const chord of b.chords) {
        const id = JSON.stringify({ ...chord, shift: chord.shift ?? false });
        assert.ok(
          !seen.has(id),
          `${tool}: ${b.action} and ${seen.get(id)} share ${id}`
        );
        seen.set(id, b.action);
      }
    }
  }
});

test('formatting for menus and the ? dialog', () => {
  assert.equal(
    formatChord({ key: 'z', mod: true, shift: true }, 'other'),
    'Ctrl + Shift + Z'
  );
  assert.equal(
    formatChord({ key: 'z', mod: true, shift: true }, 'mac'),
    '⌘ + ⇧ + Z'
  );
  assert.equal(
    formatChord({ code: 'KeyD', alt: true, shift: true }, 'other'),
    'Alt + Shift + D'
  );
  assert.equal(
    formatChord({ code: 'BracketRight', mod: true }, 'other'),
    'Ctrl + ]'
  );
  assert.equal(formatChord({ key: 'Escape' }, 'other'), 'Esc');
  const zoomIn = EXCALIDRAW_BINDINGS.find((b) => {
    return b.action === 'zoom-in';
  });
  assert.deepEqual(formatBinding(zoomIn, 'other'), ['Ctrl + =']);
  assert.equal(shortcutHint(reticulyne, 'select', 'other'), 'V');
  // A hint reads as the dialog draws the chord, + between keys everywhere.
  assert.equal(shortcutHint(reticulyne, 'group', 'mac'), '⌘ + G');
});

test('{mod} in a key label reads as the platform modifier', () => {
  const pan = reticulyne.find((b) => {
    return b.action === 'pan';
  });
  assert.deepEqual(formatBinding(pan, 'other'), ['Ctrl + Arrow keys']);
  assert.deepEqual(formatBinding(pan, 'mac'), ['⌘ + Arrow keys']);
});

// Sweep 2026-09-30: the pointer rows mixed glyphs and words ("Shift + click"
// beside "⌘ + wheel") and ran alternatives together in one phrase.
test('a gesture lists its alternatives, with the platform key names', () => {
  const row = (action) => {
    return reticulyne.find((b) => {
      return b.action === action;
    });
  };
  assert.deepEqual(formatBinding(row('shift-click'), 'mac'), ['⇧ + Click']);
  assert.deepEqual(formatBinding(row('shift-click'), 'other'), [
    'Shift + Click'
  ]);
  assert.deepEqual(formatBinding(row('alt-drag'), 'mac'), ['⌥ + Drag']);
  assert.deepEqual(formatBinding(row('space-pan'), 'other'), [
    'Space + Drag',
    'the hand tool'
  ]);
  assert.deepEqual(formatBinding(row('wheel-zoom'), 'mac'), [
    '⌘ + Wheel',
    'Pinch'
  ]);
});

// Sweep 2026-09-30 (round 3): two pointer rows were both labelled "Pan", and
// the add-item alternative was a phrase rather than keys.
test('every pointer row has its own label, and add-on-tile names its keys', () => {
  const row = (action) => {
    return reticulyne.find((b) => {
      return b.action === action;
    });
  };
  assert.equal(row('space-pan').label, 'Pan by dragging');
  assert.equal(row('wheel-pan').label, 'Pan with the wheel');
  assert.deepEqual(formatBinding(row('add-on-tile'), 'other'), [
    'Double-click an empty tile',
    'I then Enter'
  ]);
  for (const tool of ['reticulyne', 'plain']) {
    const labels = keymapFor(tool)
      .filter((b) => {
        return b.section === 'Pointer and touch';
      })
      .map((b) => {
        return b.label;
      });
    assert.equal(
      new Set(labels).size,
      labels.length,
      tool + ': ' + labels.join(', ')
    );
  }
});

test("Reticulyne's right-click row is the object menu: empty canvas has none", () => {
  const row = reticulyne.find((b) => {
    return b.action === 'context-menu';
  });
  assert.equal(row.label, "Open an object's menu");
  assert.deepEqual(formatBinding(row, 'other'), ['Right-click an object']);
  // The Excalidraw row it takes over keeps its own name.
  const shared = EXCALIDRAW_BINDINGS.find((b) => {
    return b.action === 'context-menu';
  });
  assert.equal(shared.label, 'Context menu');
});

test('the differences use the row names and the platform key names', () => {
  const mac = formatDifferences(DIFFERENCES, 'mac');
  const other = formatDifferences(DIFFERENCES, 'other');
  assert.equal(
    mac.find((d) => {
      return d.action === 'frame';
    }).here,
    'Fit to view'
  );
  const flow = (list) => {
    return list.find((d) => {
      return d.action === 'create and walk a flowchart';
    });
  };
  assert.equal(flow(mac).excalidraw, '⌘ + Arrow keys, ⌥ + Arrow keys');
  assert.equal(flow(other).excalidraw, 'Ctrl + Arrow keys, Alt + Arrow keys');
  assert.match(flow(other).here, /Ctrl \+ Arrow keys is Pan the view/);
  for (const d of [...mac, ...other]) {
    assert.doesNotMatch(d.excalidraw + d.here, /\{|Ctrl\/Cmd/);
  }
});

test('an own label names an Excalidraw row as the toolbar does', () => {
  const label = (bindings, action) => {
    return bindings.find((b) => {
      return b.action === action;
    }).label;
  };
  assert.equal(label(reticulyne, 'hand'), 'Pan');
  assert.equal(label(reticulyne, 'fit-all'), 'Fit to view');
  assert.deepEqual(
    reticulyne.find((b) => {
      return b.action === 'hand';
    }).chords,
    [{ key: 'h' }]
  );
  assert.equal(label(EXCALIDRAW_BINDINGS, 'hand'), 'Hand (pan)');
  assert.equal(label(EXCALIDRAW_BINDINGS, 'fit-all'), 'Fit everything');
});

test('the differences list names the deliberate divergences', () => {
  assert.ok(
    DIFFERENCES.some((d) => {
      return d.action === 'eraser';
    })
  );
});

test('shortcutSections groups the bindings in the spec order', () => {
  const sections = shortcutSections(plain, 'other');
  assert.deepEqual(
    sections.map((s) => {
      return s.title;
    }),
    ['Tools', 'View', 'Edit', 'Pointer and touch']
  );
  const rectangle = sections[0].rows.find((r) => {
    return r.label === 'Rectangle';
  });
  assert.ok(rectangle.keys.includes('R'));
});
