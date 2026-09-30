import { useMemo, useState } from 'react';
import {
  Box,
  ButtonBase,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { NAME_MAX, SCHEMA_LIMITS } from 'src/schemas/common';
import { floorsOf } from 'src/vendor/accurona-core';

// lw-053: the floor switcher, in the title bar where the view name was. A
// floor is a view, and the tabs read as the building does, lowest first.
// Anyone can switch floors (Alt + Up / Down too) and show or hide the
// faint other floors; only an editable diagram adds, renames (double-click
// a tab), reorders and deletes them.

const FloorName = ({
  initial,
  onDone
}: {
  initial: string;
  onDone: (value: string | null) => void;
}) => {
  const [name, setName] = useState(initial);
  const commit = () => {
    const value = name.trim();
    onDone(value && value !== initial ? value : null);
  };
  return (
    <TextField
      autoFocus
      size="small"
      variant="standard"
      value={name}
      slotProps={{
        htmlInput: {
          maxLength: NAME_MAX,
          'aria-label': 'Floor name',
          size: Math.max(6, name.length)
        }
      }}
      onChange={(e) => {
        setName(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
};

export const FloorSwitcher = () => {
  const {
    floors,
    currentView,
    showFloor,
    addFloor,
    renameFloor,
    moveFloor,
    deleteFloor
  } = useScene();
  const editable = useUiStateStore((state) => {
    return state.editorMode === 'EDITABLE';
  });
  const showOtherFloors = useUiStateStore((state) => {
    return state.showOtherFloors;
  });
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const opened = useUiStateStore((state) => {
    return state.sceneContext.opened;
  });
  // lw-055: where each floor is on the building - the plan floors its items
  // are on, most first. Read from the items as they are now, saved or not.
  const onPlan = useMemo(() => {
    return new Map(
      floors.map((floor) => {
        const where = floorsOf(
          opened,
          floor.items.map((item) => {
            return item.id;
          })
        ).map((location) => {
          return location.floorName ?? location.floorId;
        });
        return [
          floor.id,
          where.length ? `On the floor plan: ${where.join(', ')}` : undefined
        ];
      })
    );
  }, [floors, opened]);

  // One floor, and nothing to add: just its name, as before floors.
  if (floors.length === 1 && !editable) {
    return (
      <Typography noWrap sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {currentView.name}
      </Typography>
    );
  }

  const index = floors.findIndex((f) => {
    return f.id === currentView.id;
  });

  return (
    <Stack
      direction="row"
      role="tablist"
      aria-label="Floors"
      data-testid="floor-switcher"
      sx={{ alignItems: 'center', minWidth: 0, pointerEvents: 'auto' }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', minWidth: 0, overflowX: 'auto' }}
      >
        {floors.map((floor) => {
          const active = floor.id === currentView.id;
          if (renaming === floor.id) {
            return (
              <FloorName
                key={floor.id}
                initial={floor.name}
                onDone={(name) => {
                  if (name) renameFloor(floor.id, name);
                  setRenaming(null);
                }}
              />
            );
          }
          return (
            <ButtonBase
              key={floor.id}
              role="tab"
              aria-selected={active}
              data-testid={`floor-tab-${floor.id}`}
              title={
                [
                  onPlan.get(floor.id),
                  editable ? 'Double-click to rename' : undefined
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              onClick={() => {
                showFloor(floor.id);
              }}
              onDoubleClick={() => {
                if (editable) setRenaming(floor.id);
              }}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                flexShrink: 0,
                fontWeight: 600,
                typography: 'body2',
                color: active ? 'text.primary' : 'text.secondary',
                bgcolor: active ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {floor.name}
            </ButtonBase>
          );
        })}
      </Stack>
      {editable && (
        <>
          <Tooltip title="Floor options">
            <IconButton
              size="small"
              aria-label="Floor options"
              aria-haspopup="menu"
              onClick={(e) => {
                setMenu(e.currentTarget);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menu}
            open={!!menu}
            onClose={() => {
              setMenu(null);
            }}
          >
            <MenuItem
              onClick={() => {
                setMenu(null);
                setRenaming(currentView.id);
              }}
            >
              Rename floor
            </MenuItem>
            <MenuItem
              disabled={index >= floors.length - 1}
              onClick={() => {
                setMenu(null);
                moveFloor(currentView.id, 1);
              }}
            >
              Move up a floor
            </MenuItem>
            <MenuItem
              disabled={index <= 0}
              onClick={() => {
                setMenu(null);
                moveFloor(currentView.id, -1);
              }}
            >
              Move down a floor
            </MenuItem>
            <MenuItem
              disabled={floors.length <= 1}
              onClick={() => {
                setMenu(null);
                deleteFloor(currentView.id);
              }}
            >
              Delete floor
            </MenuItem>
          </Menu>
          <Tooltip title="Add a floor">
            <span>
              <IconButton
                size="small"
                aria-label="Add a floor"
                disabled={floors.length >= SCHEMA_LIMITS.VIEWS}
                onClick={() => {
                  addFloor(`Floor ${floors.length + 1}`);
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
      {floors.length > 1 && (
        <Box>
          <Tooltip
            title={showOtherFloors ? 'Hide other floors' : 'Show other floors'}
          >
            <IconButton
              size="small"
              aria-label="Show other floors"
              aria-pressed={showOtherFloors}
              onClick={() => {
                uiStateActions.setShowOtherFloors(!showOtherFloors);
              }}
            >
              {showOtherFloors ? (
                <VisibilityOutlinedIcon fontSize="small" />
              ) : (
                <VisibilityOffOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Stack>
  );
};
