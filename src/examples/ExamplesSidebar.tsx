// Examples-picker left rail. Replaces the corner <Select> with a
// collapsible sidebar listing every demo. Owned by the dev/demo bundle
// (port 2223) — not part of the published library.
import { useState } from 'react';
import {
  Box,
  Stack,
  IconButton,
  Typography,
  Button,
  Divider
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const SIDEBAR_WIDTH = 260;

interface ExampleEntry {
  name: string;
}

interface Props {
  examples: ExampleEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const ExamplesSidebar = ({
  examples,
  currentIndex,
  onSelect
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
              setIsExpanded(false);
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
      </Box>
      {!isExpanded && (
        <IconButton
          data-testid="sidebar-expand"
          aria-label="Expand sidebar"
          size="small"
          onClick={() => {
            setIsExpanded(true);
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
