import * as fs from 'fs';
import * as path from 'path';
import { readScene } from 'src/scene/read';
import { sceneToModel } from 'src/scene/convert';
import { getConnectorPath } from 'src/utils/connector';
import { prepareView } from 'src/viewer/prepare';
import { stubCanvas } from 'src/viewer/__tests__/stubCanvas';

beforeAll(stubCanvas);

// A regression guard for the connector router (connector.ts, router.ts,
// pathfinder.ts): every connector in every view of every sample diagram,
// routed and recorded. A change to the router that moves any route fails
// here; if the move is intended, regenerate the fixture with
//   UPDATE_ROUTING_FIXTURE=1 npx jest routingReference
// and review the diff. The read-only viewer draws from the same router, so
// its routes are checked against the same record.

const SAMPLES = path.resolve(__dirname, '../../../samples');
const FIXTURE = path.join(__dirname, 'fixtures/routing-reference.json');

interface Route {
  sample: string;
  view: string;
  connector: string;
  rectangle: { from: { x: number; y: number }; to: { x: number; y: number } };
  tiles: { x: number; y: number }[];
}

const route = (): Route[] => {
  const routes: Route[] = [];
  const files = fs
    .readdirSync(SAMPLES)
    .filter((file) => {
      return file.endsWith('.json');
    })
    .sort();
  for (const file of files) {
    const read = readScene(
      JSON.parse(fs.readFileSync(path.join(SAMPLES, file), 'utf8'))
    );
    if (!read.ok) throw new Error(`${file} does not read`);
    const { model } = sceneToModel(read.scene);
    for (const view of model.views) {
      for (const connector of view.connectors ?? []) {
        const { tiles, rectangle } = getConnectorPath({
          anchors: connector.anchors,
          view
        });
        routes.push({
          sample: file,
          view: view.id,
          connector: connector.id,
          rectangle,
          tiles
        });
      }
    }
  }
  return routes;
};

describe('connector routing reference', () => {
  const routes = route();

  if (process.env.UPDATE_ROUTING_FIXTURE) {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, `${JSON.stringify(routes, null, 1)}\n`);
  }
  const reference: Route[] = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

  it('covers every connector of every sample', () => {
    expect(reference.length).toBeGreaterThan(40);
    expect(
      new Set(
        reference.map((r) => {
          return r.sample;
        })
      ).size
    ).toBe(
      fs.readdirSync(SAMPLES).filter((file) => {
        return file.endsWith('.json');
      }).length
    );
  });

  it('routes every connector as recorded', () => {
    expect(routes).toEqual(reference);
  });

  it('is what the viewer draws', () => {
    const bySample = new Map<string, Route[]>();
    reference.forEach((r) => {
      bySample.set(r.sample, [...(bySample.get(r.sample) ?? []), r]);
    });
    for (const [file, recorded] of bySample) {
      const read = readScene(
        JSON.parse(fs.readFileSync(path.join(SAMPLES, file), 'utf8'))
      );
      if (!read.ok) throw new Error(file);
      const { model } = sceneToModel(read.scene);
      for (const r of recorded) {
        const view = prepareView(model, r.view);
        const drawn = view.connectors.find((c) => {
          return c.id === r.connector;
        });
        // A connector on a hidden layer or into a collapsed group is not
        // drawn, or drawn re-docked; the samples have neither.
        expect(drawn?.area).toEqual(r.rectangle);
        const gridHeight = Math.abs(r.rectangle.from.y - r.rectangle.to.y) + 1;
        const points = r.tiles
          .map((t) => {
            return `${t.x * 100 + 50},${(gridHeight - 1 - t.y) * 100 + 50}`;
          })
          .join(' ');
        expect(drawn?.points.trim()).toBe(points);
      }
    }
  });
});
