import { openErrorMessage } from '../openErrorContext';

// Sweep 2026-09-30: the examples said "That file ..." where the editor
// build names the file.
describe('openErrorMessage', () => {
  const notJson = [
    {
      code: 'custom' as const,
      message: 'Imported file is not valid JSON',
      path: []
    }
  ];
  const notDiagram = [
    { code: 'custom' as const, message: 'Required', path: ['items'] }
  ];

  test('names the file, in the editor build wording', () => {
    expect(openErrorMessage(notJson, 'a.json')).toBe(
      '“a.json” is not a diagram file (it is not valid JSON).'
    );
    expect(openErrorMessage(notDiagram, 'a.json')).toBe(
      '“a.json” is not a valid diagram.'
    );
  });

  test('without a file name it says That file', () => {
    expect(openErrorMessage(notDiagram)).toBe(
      'That file is not a valid diagram.'
    );
  });
});
