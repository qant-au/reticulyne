import { useState, useMemo, ReactNode } from 'react';
import { Box, ThemeProvider, useMediaQuery } from '@mui/material';
import { createReticulyneTheme } from 'src/styles/theme';
import { BasicEditor } from './BasicEditor/BasicEditor';
import { DebugTools } from './DebugTools/DebugTools';
import { ReadonlyMode } from './ReadonlyMode/ReadonlyMode';
import { LiveDashboard } from './LiveDashboard/LiveDashboard';
import { ConnectorAnimations } from './ConnectorAnimations/ConnectorAnimations';
import { ConnectorPulse } from './ConnectorPulse/ConnectorPulse';
import { NodeIndicators } from './NodeIndicators/NodeIndicators';
import { ExamplesSidebar, SIDEBAR_WIDTH } from './ExamplesSidebar';
import {
  ExamplesThemeModeProvider,
  useExamplesThemeMode
} from './themeModeContext';

// The sidebar sits outside every example's <Reticulyne>, so it had no
// theme of its own and stayed white on a dark diagram.
const SidebarTheme = ({ children }: { children: ReactNode }) => {
  const { themeMode } = useExamplesThemeMode();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const mode =
    themeMode === 'auto' ? (prefersDark ? 'dark' : 'light') : themeMode;
  const theme = useMemo(() => {
    return createReticulyneTheme(mode);
  }, [mode]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

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
  // Collapsed on a phone, where open it left a 130px canvas.
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    return window.innerWidth >= 600;
  });

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
        <SidebarTheme>
          <ExamplesSidebar
            examples={examples}
            currentIndex={currentExample}
            onSelect={setCurrentExample}
            isExpanded={isSidebarExpanded}
            onExpandedChange={setIsSidebarExpanded}
          />
        </SidebarTheme>
      </Box>
    </ExamplesThemeModeProvider>
  );
};
