// Examples-picker left rail. Replaces the corner <Select> with a
// collapsible sidebar listing every demo. Owned by the dev/demo bundle
// (port 2223) — not part of the published library.
import {
  Box,
  Stack,
  IconButton,
  Typography,
  Button,
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useExamplesThemeMode } from './themeModeContext';

// Exported so the picker's Examples wrapper can reserve the same
// horizontal slice for the diagram container — without this, the
// diagram renders 100vw underneath the fixed-position sidebar.
export const SIDEBAR_WIDTH = 260;

interface ExampleEntry {
  name: string;
}

interface Props {
  examples: ExampleEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
}

export const ExamplesSidebar = ({
  examples,
  currentIndex,
  onSelect,
  isExpanded,
  onExpandedChange
}: Props) => {
  const { themeMode, setThemeMode } = useExamplesThemeMode();

  return (
    <>
      <Box
        data-testid="examples-sidebar"
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: isExpanded ? SIDEBAR_WIDTH : 0,
          overflow: 'hidden',
          transition: 'width 200ms ease-in-out',
          bgcolor: 'background.paper',
          borderRight: isExpanded ? '1px solid' : 'none',
          borderColor: 'grey.300',
          boxShadow: isExpanded ? 1 : 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            minWidth: SIDEBAR_WIDTH
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Examples
          </Typography>
          <IconButton
            data-testid="sidebar-collapse"
            aria-label="Collapse sidebar"
            size="small"
            onClick={() => {
              onExpandedChange(false);
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Box>
        <Stack
          spacing={0.5}
          sx={{ p: 1, minWidth: SIDEBAR_WIDTH, overflowY: 'auto' }}
        >
          {examples.map((example, i) => {
            const isActive = i === currentIndex;
            return (
              <Button
                key={example.name}
                data-testid={`sidebar-item-${i}`}
                onClick={() => {
                  onSelect(i);
                }}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  bgcolor: isActive ? 'action.selected' : 'transparent',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  fontWeight: isActive ? 600 : 400,
                  '&:hover': {
                    bgcolor: isActive ? 'action.selected' : 'action.hover'
                  }
                }}
              >
                {example.name}
              </Button>
            );
          })}
        </Stack>
        <Divider />
        {/* FEA7-04 demo: drives every example's Isoflow themeMode prop
            via the examples-themed context so the picker can showcase
            light / auto / dark side by side. */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            minWidth: SIDEBAR_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textTransform: 'uppercase' }}
          >
            Theme
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={themeMode}
            exclusive
            onChange={(_, next) => {
              if (next) setThemeMode(next);
            }}
            data-testid="theme-mode-toggle"
            sx={{ width: '100%' }}
          >
            <ToggleButton
              value="light"
              sx={{ flex: 1, textTransform: 'none' }}
              data-testid="theme-mode-light"
            >
              Light
            </ToggleButton>
            <ToggleButton
              value="auto"
              sx={{ flex: 1, textTransform: 'none' }}
              data-testid="theme-mode-auto"
            >
              Auto
            </ToggleButton>
            <ToggleButton
              value="dark"
              sx={{ flex: 1, textTransform: 'none' }}
              data-testid="theme-mode-dark"
            >
              Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {!isExpanded && (
        <IconButton
          data-testid="sidebar-expand"
          aria-label="Expand sidebar"
          size="small"
          onClick={() => {
            onExpandedChange(true);
          }}
          sx={{
            position: 'fixed',
            left: 8,
            top: 8,
            zIndex: 101,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'grey.300',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'grey.100'
            }
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </>
  );
};
