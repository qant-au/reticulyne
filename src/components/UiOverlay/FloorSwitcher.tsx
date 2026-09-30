import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  Divider,
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

// In the title bar the diagram's title gives way first (TitleBar), then the
// floors: the floors not shown first, each with an ellipsis, down to a
// letter or two; only then the shown floor's name, which keeps a few
// letters. The other floors kept their names and scrolled, so on a phone
// they ran on to the options button, cut with no ellipsis ("First flo",
// "Lab" a sliver), while the shown floor read "Gr..." (sweep 2026-09-30,
// round 4). A shrink factor far above the shown floor's is what orders it.
// Scrolling is left for more floors than even that fits. A shown name this
// short never truncates: a minimum wider than the name itself would leave
// a gap beside it.
const nameShrink = (name: string) => {
  return name.length <= 4
    ? { flexShrink: 0 }
    : { flexShrink: 1, minWidth: '3.5em' };
};
const otherShrink = (name: string) => {
  return name.length <= 2
    ? { flexShrink: 0 }
    : { flexShrink: 10000, minWidth: '2.75em' };
};

export const FloorSwitcher = ({
  roomKey = ''
}: {
  /** Changes when the room the title bar has changes (its width, the title). */
  roomKey?: string;
}) => {
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
  // Rename floor waits for the menu to finish closing: the menu hands focus
  // back to its button as it closes, which would blur the name field shut
  // the moment it opened.
  const [renameOnClose, setRenameOnClose] = useState(false);
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

  // When the tabs do not fit even with every name cut to a letter or two
  // (a phone with three floors and the save status), they collapse: the
  // shown floor's tab, and the other floors in the options menu with Add a
  // floor and Show other floors. Scrolling cut the last tab visible
  // mid-name, under the buttons (sweep 2026-09-30, round 4). Measured
  // before paint; anything that changes the room tries the tabs again.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const saveKey = useUiStateStore((state) => {
    return state.saveStatus.state + ':' + String(state.saveStatus.isDirty);
  });
  const fitKey = [
    roomKey,
    saveKey,
    editable,
    currentView.id,
    ...floors.map((f) => {
      return f.id + ':' + f.name;
    })
  ].join('|');
  // The room the tabs did not fit in; collapsed while the room is the same.
  const [collapsedFor, setCollapsedFor] = useState<string | null>(null);
  const collapsed = collapsedFor === fitKey;
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!collapsed && el && el.scrollWidth > el.clientWidth + 1) {
      setCollapsedFor(fitKey);
    }
  }, [collapsed, fitKey]);

  // One floor, and nothing to add: just its name, as before floors.
  if (floors.length === 1 && !editable) {
    return (
      <Typography
        noWrap
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          ...nameShrink(currentView.name)
        }}
      >
        {currentView.name}
      </Typography>
    );
  }

  const index = floors.findIndex((f) => {
    return f.id === currentView.id;
  });

  const shownFloors = collapsed
    ? floors.filter((f) => {
        return f.id === currentView.id;
      })
    : floors;
  const hasMenu = editable || (collapsed && floors.length > 1);
  const closeMenu = () => {
    setMenu(null);
  };

  return (
    <Stack
      direction="row"
      role="tablist"
      aria-label="Floors"
      data-testid="floor-switcher"
      data-collapsed={collapsed || undefined}
      sx={{
        alignItems: 'center',
        minWidth: 0,
        pointerEvents: 'auto'
      }}
    >
      <Stack
        ref={scrollerRef}
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', minWidth: 0, overflowX: 'auto' }}
      >
        {shownFloors.map((floor) => {
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
                // Collapsed, the one tab left gives way to the end, with
                // an ellipsis, rather than overflow its space.
                ...(collapsed
                  ? { flexShrink: 1, minWidth: 0 }
                  : active
                    ? nameShrink(floor.name)
                    : otherShrink(floor.name)),
                fontWeight: 600,
                typography: 'body2',
                color: active ? 'text.primary' : 'text.secondary',
                bgcolor: active ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {floor.name}
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>
      {hasMenu && (
        <>
          <Tooltip title={collapsed ? 'Floors' : 'Floor options'}>
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
            onClose={closeMenu}
            slotProps={{
              // As the Diagrams menu: closing, its invisible backdrop let
              // no click through until the fade ended.
              root: { sx: { pointerEvents: menu ? undefined : 'none' } },
              transition: {
                onExited: () => {
                  if (!renameOnClose) return;
                  setRenameOnClose(false);
                  setRenaming(currentView.id);
                }
              }
            }}
          >
            {collapsed &&
              [...floors].reverse().map((floor) => {
                return (
                  <MenuItem
                    key={floor.id}
                    selected={floor.id === currentView.id}
                    onClick={() => {
                      closeMenu();
                      showFloor(floor.id);
                    }}
                  >
                    {floor.name}
                  </MenuItem>
                );
              })}
            {collapsed && floors.length > 1 && (
              <MenuItem
                onClick={() => {
                  closeMenu();
                  uiStateActions.setShowOtherFloors(!showOtherFloors);
                }}
              >
                {showOtherFloors ? 'Hide other floors' : 'Show other floors'}
              </MenuItem>
            )}
            {collapsed && editable && <Divider />}
            {editable && (
              <MenuItem
                onClick={() => {
                  closeMenu();
                  setRenameOnClose(true);
                }}
              >
                Rename floor
              </MenuItem>
            )}
            {editable && (
              <MenuItem
                disabled={index >= floors.length - 1}
                onClick={() => {
                  closeMenu();
                  moveFloor(currentView.id, 1);
                }}
              >
                Move up a floor
              </MenuItem>
            )}
            {editable && (
              <MenuItem
                disabled={index <= 0}
                onClick={() => {
                  closeMenu();
                  moveFloor(currentView.id, -1);
                }}
              >
                Move down a floor
              </MenuItem>
            )}
            {editable && (
              <MenuItem
                disabled={floors.length <= 1}
                onClick={() => {
                  closeMenu();
                  deleteFloor(currentView.id);
                }}
              >
                Delete floor
              </MenuItem>
            )}
            {collapsed && editable && (
              <MenuItem
                disabled={floors.length >= SCHEMA_LIMITS.VIEWS}
                onClick={() => {
                  closeMenu();
                  addFloor(`Floor ${floors.length + 1}`);
                }}
              >
                Add a floor
              </MenuItem>
            )}
          </Menu>
        </>
      )}
      {editable && !collapsed && (
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
      )}
      {floors.length > 1 && !collapsed && (
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
