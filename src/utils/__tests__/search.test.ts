import { searchNodes } from '../search';

// ROADMAP 2.7.
const nodes = [
  { id: 'a', name: 'Web server', iconName: 'server' },
  { id: 'b', name: 'web', description: '<p>Front door</p>' },
  {
    id: 'c',
    name: 'Database',
    description: '<p>Holds <b>web</b> sessions</p>'
  },
  { id: 'd', name: 'Cache', iconName: 'redis-webcache' },
  { id: 'e', name: 'Queue' }
];

describe('searchNodes', () => {
  test('ranks exact > prefix > substring > description > icon name', () => {
    expect(searchNodes('web', nodes)).toEqual(['b', 'a', 'c', 'd']);
  });

  test('is case-insensitive and ignores surrounding space', () => {
    expect(searchNodes('  QUEUE ', nodes)).toEqual(['e']);
  });

  test('matches description text, not its markup', () => {
    expect(searchNodes('front door', nodes)).toEqual(['b']);
    expect(searchNodes('<b>', nodes)).toEqual([]);
  });

  test('an empty query matches nothing', () => {
    expect(searchNodes('   ', nodes)).toEqual([]);
  });
});
