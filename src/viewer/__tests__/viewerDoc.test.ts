import * as fs from 'fs';
import * as path from 'path';
import { renderDiagram } from 'src/viewer';
import { stubCanvas } from './stubCanvas';

// docs/viewer.md must describe the viewer that ships: every member of the
// Viewer it returns, every option, and the package entry it is imported
// from.

const ROOT = path.resolve(__dirname, '../../..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/viewer.md'), 'utf8');
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
);
const sample = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'samples/office-network.json'), 'utf8')
);

beforeAll(stubCanvas);

// The ViewerOptions keys, as typed in src/viewer/index.ts.
const OPTIONS = [
  'viewId',
  'projection',
  'theme',
  'background',
  'grid',
  'icons',
  'onViewChange'
];

describe('docs/viewer.md', () => {
  it('names every member of the Viewer', () => {
    const container = document.createElement('div');
    const viewer = renderDiagram(container, sample);
    const members = [
      ...Object.keys(viewer),
      ...Object.getOwnPropertyNames(viewer)
    ];
    new Set(members).forEach((member) => {
      expect(doc).toContain(`\`${member}`);
    });
    viewer.destroy();
  });

  it('names every option', () => {
    const source = fs.readFileSync(
      path.join(ROOT, 'src/viewer/index.ts'),
      'utf8'
    );
    const typed = source
      .slice(
        source.indexOf('export interface ViewerOptions'),
        source.indexOf('export interface Viewer {')
      )
      .match(/^ {2}(\w+)\??:/gm)!
      .map((line) => {
        return line.trim().replace(/\??:$/, '');
      });
    expect(typed.sort()).toEqual([...OPTIONS].sort());
    OPTIONS.forEach((option) => {
      expect(doc).toContain(`| \`${option}\``);
    });
  });

  it('imports from the entry package.json exports', () => {
    expect(pkg.exports['./viewer']).toBeDefined();
    expect(doc).toContain("from '@reticulyne/editor/viewer'");
  });
});
