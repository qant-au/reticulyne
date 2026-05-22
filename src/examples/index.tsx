import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { BasicEditor } from './BasicEditor/BasicEditor';
import { DebugTools } from './DebugTools/DebugTools';
import { ReadonlyMode } from './ReadonlyMode/ReadonlyMode';
import { LiveDashboard } from './LiveDashboard/LiveDashboard';
import { ConnectorAnimations } from './ConnectorAnimations/ConnectorAnimations';
import { ConnectorPulse } from './ConnectorPulse/ConnectorPulse';
import { NodeIndicators } from './NodeIndicators/NodeIndicators';
import { ExamplesSidebar, SIDEBAR_WIDTH } from './ExamplesSidebar';
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
  // Owned at this level so the diagram container can reserve the
  // sidebar's slice when expanded. Pre-fix, the sidebar lived above
  // a 100vw diagram and the diagram rendered behind it — the debug
  // tools overlay (top-left) was the visible tell.
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const Example = useMemo(() => {
    return examples[currentExample].component;
  }, [currentExample]);

  return (
    <ExamplesThemeModeProvider>
      <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            marginLeft: isSidebarExpanded ? `${SIDEBAR_WIDTH}px` : 0,
            width: isSidebarExpanded
              ? `calc(100% - ${SIDEBAR_WIDTH}px)`
              : '100%',
            // Match the sidebar's 200ms ease-in-out so the diagram
            // re-fits in lockstep with the rail sliding in/out.
            transition: 'margin-left 200ms ease-in-out, width 200ms ease-in-out'
          }}
        >
          {Example && <Example />}
        </Box>
        <ExamplesSidebar
          examples={examples}
          currentIndex={currentExample}
          onSelect={setCurrentExample}
          isExpanded={isSidebarExpanded}
          onExpandedChange={setIsSidebarExpanded}
        />
      </Box>
    </ExamplesThemeModeProvider>
  );
};
