// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see below
// @ts-nocheck: ported as-is from untyped JavaScript tests; the fixtures
// are deliberately loose literals (the schema is what checks them).
import { strict as assert } from 'node:assert';
import {
  DIFFERENCES,
  SHARED_BINDINGS,
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

const reticulyne = keymapFor('reticulyne');
const axonometra = keymapFor('axonometra');

test('tool letters and the number row', () => {
  assert.equal(resolveAction(ev('v', 'KeyV'), axonometra), 'select');
  assert.equal(
    resolveAction(ev('V', 'KeyV'), axonometra),
    'select',
    'caps lock'
  );
  assert.equal(resolveAction(ev('1', 'Digit1'), axonometra), 'select');
  assert.equal(resolveAction(ev('l', 'KeyL'), axonometra), 'wall');
  assert.equal(resolveAction(ev('6', 'Digit6'), axonometra), 'wall');
  assert.equal(resolveAction(ev('d', 'KeyD'), axonometra), 'door');
  assert.equal(resolveAction(ev('e', 'KeyE'), axonometra), 'eraser');
  assert.equal(resolveAction(ev('0', 'Digit0'), axonometra), 'eraser');
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
  assert.equal(resolveAction(ev('f', 'KeyF'), axonometra), null);
});

test('omit leaves a where-built row unbound', () => {
  const map = keymapFor('axonometra', { omit: ['group', 'keep-tool'] });
  assert.equal(resolveAction(ev('g', 'KeyG', { ctrlKey: true }), map), null);
  assert.equal(resolveAction(ev('q', 'KeyQ'), map), null);
  assert.equal(
    resolveAction(ev('g', 'KeyG', { ctrlKey: true }), axonometra),
    'group'
  );
});

test('modifiers must match exactly', () => {
  assert.equal(
    resolveAction(ev('v', 'KeyV', { ctrlKey: true }), axonometra),
    'paste'
  );
  assert.equal(
    resolveAction(ev('v', 'KeyV', { metaKey: true }), axonometra),
    'paste'
  );
  assert.equal(
    resolveAction(ev('V', 'KeyV', { shiftKey: true }), axonometra),
    null,
    'Shift+V is flip, unbound'
  );
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft'), axonometra),
    'nudge'
  );
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { shiftKey: true }), axonometra),
    'nudge'
  );
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true }), axonometra),
    null,
    'Ctrl+arrow is flowchart, unbound'
  );
  assert.equal(
    resolveAction(
      ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true, shiftKey: true }),
      axonometra
    ),
    'align-left'
  );
});

test('undo, redo and Ctrl+Y (Ctrl only)', () => {
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { metaKey: true }), axonometra),
    'undo'
  );
  assert.equal(
    resolveAction(
      ev('Z', 'KeyZ', { metaKey: true, shiftKey: true }),
      axonometra
    ),
    'redo'
  );
  assert.equal(
    resolveAction(ev('y', 'KeyY', { ctrlKey: true }), axonometra),
    'redo'
  );
  assert.equal(
    resolveAction(ev('y', 'KeyY', { metaKey: true }), axonometra),
    null
  );
});

test('Alt chords match the physical key', () => {
  // On macOS, Option+Shift+D types a character, not "d".
  assert.equal(
    resolveAction(
      ev('Î', 'KeyD', { altKey: true, shiftKey: true }),
      axonometra
    ),
    'toggle-theme'
  );
  assert.equal(
    resolveAction(ev('ˆ', 'KeyI', { altKey: true }), reticulyne),
    'toggle-highlight'
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
  assert.equal(
    resolveAction(ev('ArrowUp', 'ArrowUp', { altKey: true }), axonometra),
    null
  );
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
  assert.equal(
    resolveAction(ev('Tab', 'Tab'), axonometra),
    null,
    'Reticulyne only'
  );
  assert.equal(formatChord({ key: 'ContextMenu' }, 'other'), 'Menu');
});

test('zoom keys and fit', () => {
  assert.equal(
    resolveAction(ev('=', 'Equal', { ctrlKey: true }), axonometra),
    'zoom-in'
  );
  assert.equal(
    resolveAction(
      ev('+', 'Equal', { ctrlKey: true, shiftKey: true }),
      axonometra
    ),
    'zoom-in'
  );
  assert.equal(
    resolveAction(ev('-', 'Minus', { metaKey: true }), axonometra),
    'zoom-out'
  );
  assert.equal(
    resolveAction(ev('0', 'Digit0', { ctrlKey: true }), axonometra),
    'zoom-reset'
  );
  assert.equal(
    resolveAction(ev('=', 'Equal'), axonometra),
    null,
    'bare = is a Reticulyne alias'
  );
  assert.equal(resolveAction(ev('=', 'Equal'), reticulyne), 'zoom-in');
  assert.equal(
    resolveAction(ev('!', 'Digit1', { shiftKey: true }), axonometra),
    'fit-all'
  );
  assert.equal(
    resolveAction(ev('@', 'Digit2', { shiftKey: true }), axonometra),
    'fit-selection'
  );
  assert.equal(
    resolveAction(ev('?', 'Slash', { shiftKey: true }), axonometra),
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
    resolveAction(ev('z', 'KeyZ', { ctrlKey: true }), axonometra, ro),
    null
  );
  assert.equal(resolveAction(ev('Delete', 'Delete'), axonometra, ro), null);
  assert.equal(resolveAction(ev('l', 'KeyL'), axonometra, ro), null);
  assert.equal(resolveAction(ev('h', 'KeyH'), axonometra, ro), 'hand');
  assert.equal(resolveAction(ev('v', 'KeyV'), axonometra, ro), 'select');
  assert.equal(
    resolveAction(ev('f', 'KeyF', { ctrlKey: true }), axonometra, ro),
    'find'
  );
  assert.equal(
    resolveAction(ev('?', 'Slash', { shiftKey: true }), axonometra, ro),
    'help'
  );
  assert.equal(
    resolveAction(
      ev('Î', 'KeyD', { altKey: true, shiftKey: true }),
      axonometra,
      ro
    ),
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
    resolveAction(
      ev('z', 'KeyZ', { ctrlKey: true, target: input }),
      axonometra
    ),
    null
  );
  assert.equal(
    resolveAction(
      ev('z', 'KeyZ', { ctrlKey: true, target: input }),
      axonometra,
      { typingGuard: false }
    ),
    'undo'
  );
});

test('matchChord: a code chord ignores the character', () => {
  assert.equal(
    matchChord(ev('x', 'KeyG', { ctrlKey: true }), { code: 'KeyG', mod: true }),
    true
  );
});

test('no two bindings in a tool share a chord', () => {
  for (const [tool, map] of [
    ['reticulyne', reticulyne],
    ['axonometra', axonometra]
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
  const zoomIn = SHARED_BINDINGS.find((b) => {
    return b.action === 'zoom-in';
  });
  assert.deepEqual(formatBinding(zoomIn, 'other'), ['Ctrl + =']);
  assert.equal(shortcutHint(axonometra, 'wall', 'other'), 'L');
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
  for (const tool of ['reticulyne', 'axonometra']) {
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
  const shared = axonometra.find((b) => {
    return b.action === 'context-menu';
  });
  assert.equal(shared.label, 'Context menu');
});

test('the differences use the row names and the platform key names', () => {
  const mac = formatDifferences(DIFFERENCES.reticulyne, 'mac');
  const other = formatDifferences(DIFFERENCES.reticulyne, 'other');
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

test("a tool's own label names a shared row as its toolbar does", () => {
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
  assert.equal(label(axonometra, 'hand'), 'Hand (pan)');
  assert.equal(label(axonometra, 'fit-all'), 'Fit everything');
});

test('each tool has a differences list', () => {
  assert.ok(
    DIFFERENCES.reticulyne.some((d) => {
      return d.action === 'eraser';
    })
  );
  assert.ok(
    DIFFERENCES.axonometra.some((d) => {
      return d.here.includes('door');
    })
  );
});

test('shortcutSections groups a tool in the spec order', () => {
  const sections = shortcutSections(axonometra, 'other');
  assert.deepEqual(
    sections.map((s) => {
      return s.title;
    }),
    ['Tools', 'View', 'Edit', 'Pointer and touch']
  );
  const wall = sections[0].rows.find((r) => {
    return r.label === 'Wall';
  });
  assert.deepEqual(wall.keys, ['L', '6']);
});
