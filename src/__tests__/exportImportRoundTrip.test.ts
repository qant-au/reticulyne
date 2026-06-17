/**
 * @jest-environment jsdom
 */
import FileSaver from 'file-saver';
import { exportAsJSON } from 'src/utils/exportOptions';
import { handleImportedJsonText } from 'src/components/MainMenu/useImportFile';
import { initialDataSchema } from 'src/schemas/model';
import { model as fixtureModel } from 'src/fixtures/model';
import type { InitialData } from 'src/types';

// QUA-09: the EXPORT.JSON → ACTION.OPEN path is the persistence contract.
// exportAsJSON serialises the Model to JSON; the import path parses it and
// re-validates through initialDataSchema. This round-trips a known-valid
// fixture and asserts the imported, schema-validated model is identical —
// a guard against export/import drifting out of schema parity.

// exportOptions pulls in html-to-image + jspdf at module load (used by the
// PNG/PDF/SVG paths, not by exportAsJSON). Stub them so the import is hermetic.
jest.mock('html-to-image', () => {
  return { toPng: jest.fn(), toSvg: jest.fn() };
});
jest.mock('jspdf', () => {
  return { jsPDF: jest.fn() };
});
// Capture the Blob handed to the download trigger instead of touching the
// browser download path.
jest.mock('file-saver', () => {
  return { __esModule: true, default: { saveAs: jest.fn() } };
});

const saveAs = (FileSaver as unknown as { saveAs: jest.Mock }).saveAs;

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
  saveAs.mockClear();
});

describe('JSON export → import round-trip (QUA-09)', () => {
  test('a model survives export then import unchanged', async () => {
    exportAsJSON(fixtureModel);

    expect(saveAs).toHaveBeenCalledTimes(1);
    const blob = saveAs.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('application/json');
    const json = await readBlobText(blob);

    let imported: InitialData | undefined;
    handleImportedJsonText(json, (data) => {
      const result = initialDataSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) imported = result.data as InitialData;
    });

    expect(imported).toEqual(fixtureModel);
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
