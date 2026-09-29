import { planArrangement, ArrangeMember } from '../arrange';

// align / distribute planning.
const node = (id: string, x: number, y: number): ArrangeMember => {
  return { ref: { type: 'ITEM', id }, at: { x, y } };
};
const box = (id: string, x: number, y: number): ArrangeMember => {
  return { ref: { type: 'TEXTBOX', id }, at: { x, y } };
};

describe('planArrangement', () => {
  test('align X moves everyone onto the active member’s X', () => {
    const moves = planArrangement(
      'ALIGN_X',
      [node('a', 0, 0), node('b', 3, 2), box('t', -2, 5)],
      { type: 'ITEM', id: 'b' },
      []
    )!;
    expect(moves).toEqual([
      { ref: { type: 'ITEM', id: 'a' }, delta: { x: 3, y: 0 } },
      { ref: { type: 'TEXTBOX', id: 't' }, delta: { x: 5, y: 0 } }
    ]);
  });

  test('distribute Y keeps the ends and spaces the rest on whole tiles', () => {
    const moves = planArrangement(
      'DISTRIBUTE_Y',
      [node('a', 0, 0), node('b', 1, 1), node('c', 2, 10)],
      null,
      []
    )!;
    expect(moves).toEqual([
      { ref: { type: 'ITEM', id: 'b' }, delta: { x: 0, y: 4 } }
    ]);
  });

  test('an arrangement that stacks two nodes on one tile is refused', () => {
    expect(
      planArrangement('ALIGN_X', [node('a', 0, 0), node('b', 3, 0)], null, [])
    ).toBeNull();
    // Onto a node outside the selection, too.
    expect(
      planArrangement('ALIGN_Y', [node('a', 0, 0), node('b', 3, 2)], null, [
        { x: 3, y: 0 }
      ])
    ).toBeNull();
  });

  test('text boxes may share a line with nodes; too few members is refused', () => {
    expect(
      planArrangement('ALIGN_X', [node('a', 0, 0), box('t', 3, 0)], null, [])
    ).not.toBeNull();
    expect(planArrangement('ALIGN_X', [node('a', 0, 0)], null, [])).toBeNull();
    expect(
      planArrangement(
        'DISTRIBUTE_X',
        [node('a', 0, 0), node('b', 5, 1)],
        null,
        []
      )
    ).toBeNull();
  });
});
