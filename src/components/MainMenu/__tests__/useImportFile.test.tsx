import { handleImportedJsonText } from '../useImportFile';

describe('handleImportedJsonText (BUG5-05)', () => {
  let errorSpy: jest.SpyInstance;
  let load: jest.Mock;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      return undefined;
    });
    load = jest.fn();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('parses valid JSON and forwards it to load()', () => {
    handleImportedJsonText('{"title":"valid"}', load);
    expect(load).toHaveBeenCalledWith({ title: 'valid' });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('logs an [isoflow] error and skips load() when the text is not valid JSON', () => {
    // Before BUG5-05 the JSON.parse(...) call sat unprotected inside
    // the FileReader onload — a malformed file produced an uncaught
    // SyntaxError, no UI feedback, no console signal. The file picker
    // silently did nothing and the user had no way to tell.
    handleImportedJsonText('not-json{', load);
    expect(load).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch(
      /\[isoflow\] imported file is not valid JSON/
    );
  });

  test('logs an [isoflow] error and skips load() when the input is null', () => {
    handleImportedJsonText(null, load);
    expect(load).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toMatch(
      /\[isoflow\] imported file could not be read as text/
    );
  });
});
