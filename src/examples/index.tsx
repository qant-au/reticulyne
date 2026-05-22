import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { BasicEditor } from './BasicEditor/BasicEditor';
import { DebugTools } from './DebugTools/DebugTools';
import { ReadonlyMode } from './ReadonlyMode/ReadonlyMode';
import { LiveDashboard } from './LiveDashboard/LiveDashboard';
import { ConnectorAnimations } from './ConnectorAnimations/ConnectorAnimations';
import { ConnectorPulse } from './ConnectorPulse/ConnectorPulse';
import { NodeIndicators } from './NodeIndicators/NodeIndicators';
import { ExamplesSidebar } from './ExamplesSidebar';
import { ExamplesThemeModeProvider } from './themeModeContext';

const examples = [
  { name: 'Basic editor', component: BasicEditor },
  { name: 'Debug tools', component: DebugTools },
  { name: 'Read-only mode', component: ReadonlyMode },
  { name: 'Live dashboard', component: LiveDashboard },
  { name: 'Connector animations', component: ConnectorAnimations },
  { name: 'Connector pulse', component: ConnectorPulse },
  { name: 'Node indicators', component: NodeIndicators }
];

export const Examples = () => {
  const [currentExample, setCurrentExample] = useState(0);

  const Example = useMemo(() => {
    return examples[currentExample].component;
  }, [currentExample]);

  return (
    <ExamplesThemeModeProvider>
      <Box sx={{ width: '100vw', height: '100vh' }}>
        <Box sx={{ width: '100%', height: '100%' }}>
          {Example && <Example />}
        </Box>
        <ExamplesSidebar
          examples={examples}
          currentIndex={currentExample}
          onSelect={setCurrentExample}
        />
      </Box>
    </ExamplesThemeModeProvider>
  );
};
