/**
 * @jest-environment jsdom
 */
import { exportAsJSON } from 'src/utils/exportOptions';
import { handleImportedJsonText } from 'src/components/MainMenu/useImportFile';
import { model as fixtureModel } from 'src/fixtures/model';
import { SCENE_SCHEMA_URL, type Scene } from 'src/vendor/accurona-core';
import {
  legacyModelToScene,
  readScene,
  sceneFromModel,
  sceneToModel
} from 'src/scene';

// QUA-09: the EXPORT.JSON → ACTION.OPEN path is the persistence contract.
// exportAsJSON writes a scene (the file format); the import path parses it
// and validates it as a scene. This round-trips a known-valid fixture and
// asserts the imported scene, and the model it opens to, are identical.

// exportOptions pulls in html-to-image + jspdf at module load (used by the
// PNG/PDF/SVG paths, not by exportAsJSON). Stub them so the import is hermetic.
jest.mock('html-to-image', () => {
  return { toPng: jest.fn(), toSvg: jest.fn() };
});
jest.mock('jspdf', () => {
  return { jsPDF: jest.fn() };
});
// Capture the Blob handed to the download trigger instead of touching the
// browser download path. downloadFile() turns it into a blob: URL first,
// and jsdom implements neither createObjectURL nor revokeObjectURL.
const createObjectURL = jest.fn((blob: Blob) => {
  return `blob:test/${blob.size}`;
});
URL.createObjectURL = createObjectURL;
URL.revokeObjectURL = jest.fn();
jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

// jsdom's Blob doesn't implement .text() in this version; read via FileReader.
const readBlobText = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      return resolve(reader.result as string);
    };
    reader.onerror = () => {
      return reject(reader.error);
    };
    reader.readAsText(blob);
  });
};

beforeEach(() => {
  createObjectURL.mockClear();
});

describe('JSON export → import round-trip (QUA-09)', () => {
  test('the export is a scene that opens to the same diagram', async () => {
    const opened = legacyModelToScene(fixtureModel, 'fixture');
    const { model, context } = sceneToModel(opened);
    exportAsJSON(sceneFromModel(model, context));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toContain('application/json');
    const json = await readBlobText(blob);
    const body = JSON.parse(json);
    expect(body.format).toBe('accurona-scene');
    expect(body.$schema).toBe(SCENE_SCHEMA_URL);
    expect(body).not.toHaveProperty('items');

    let imported: Scene | undefined;
    handleImportedJsonText(json, (data) => {
      const result = readScene(data);
      expect(result.ok).toBe(true);
      if (result.ok) imported = result.scene;
    });

    expect(imported).toEqual({ $schema: SCENE_SCHEMA_URL, ...opened });
    expect(sceneToModel(imported!).model).toEqual(model);
  });

  test('a legacy model file still opens, converted to a scene', () => {
    let imported: Scene | undefined;
    handleImportedJsonText(JSON.stringify(fixtureModel), (data) => {
      const result = readScene(data);
      if (result.ok) imported = result.scene;
    });
    expect(imported?.format).toBe('accurona-scene');
    expect(imported?.objects).toHaveLength(fixtureModel.items.length);
  });

  test('keys that reach a prototype are dropped on parse', () => {
    const load = jest.fn();
    handleImportedJsonText(
      '{"__proto__": {"polluted": true}, "title": "x"}',
      load
    );
    expect(load).toHaveBeenCalledWith({ title: 'x' });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  test('malformed JSON does not reach load and is logged', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
    const load = jest.fn();

    handleImportedJsonText('{ not valid json', load);

    expect(load).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('not valid JSON'),
      expect.anything()
    );
    errorSpy.mockRestore();
  });
});
