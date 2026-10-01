import Reticulyne from 'src/Reticulyne';
import type { TourStep } from 'src/types';
import { initialData } from '../initialData';
import { useExamplesThemeMode } from '../themeModeContext';
import { useExamplesValidationError } from '../openErrorContext';

// A short tour, offered by a Start tour button. The second and
// third steps have no narration of their own, so they read the node's
// description.
const TOUR: TourStep[] = [
  {
    nodeId: 'item1',
    narration:
      '<p>Every system here reads from the <strong>operational database</strong>.</p>'
  },
  { nodeId: 'bc6fdded-a090-4eae-b1fe-fe0ee0fd1c92' },
  { nodeId: 'c54ab120-44d2-46d2-9fc1-efd83ab67307', zoom: 0.6 }
];

export const ReadonlyMode = () => {
  const { themeMode } = useExamplesThemeMode();
  const onValidationError = useExamplesValidationError();
  return (
    <Reticulyne
      initialData={{ ...initialData, fitToView: true }}
      editorMode="EXPLORABLE_READONLY"
      themeMode={themeMode}
      onValidationError={onValidationError}
      tour={TOUR}
    />
  );
};
