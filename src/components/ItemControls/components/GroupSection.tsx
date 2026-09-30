import { useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { groupChain, groupMatchingSelection } from 'src/utils';
import type { ItemReference } from 'src/types';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { PanelSection } from 'src/vendor/accurona-ui';
import { shortcutHint } from 'src/vendor/accurona-core';
import { KEYMAP } from 'src/interaction/useKeyboardShortcuts';

// Keyed on the group and its saved name, so it starts over when either
// changes rather than syncing state in an effect.
const NameField = ({
  initial,
  onCommit
}: {
  initial: string;
  onCommit: (value: string) => void;
}) => {
  const [name, setName] = useState(initial);
  const commit = () => {
    if (name.trim() !== initial) onCommit(name.trim());
  };
  return (
    <TextField
      size="small"
      label="Group name"
      value={name}
      slotProps={{ htmlInput: { maxLength: 100 } }}
      onChange={(e) => {
        setName(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
};

// in the multi-select panel. Group the selection, or, when
// the selection is a group, name it, colour it or ungroup it.
export const GroupSection = ({ selection }: { selection: ItemReference[] }) => {
  const { currentView, colors, groupSelection, ungroupSelection, updateGroup } =
    useScene();
  const editorMode = useUiStateStore((state) => {
    return state.editorMode;
  });
  const editingGroupId = useUiStateStore((state) => {
    return state.editingGroupId;
  });
  const setEditingGroupId = useUiStateStore((state) => {
    return state.actions.setEditingGroupId;
  });
  const groupId = groupMatchingSelection(currentView, selection);
  const group = currentView.groups?.find((g) => {
    return g.id === groupId;
  });

  if (editorMode !== 'EDITABLE') return null;
  const groupable = selection.filter((s) => {
    return s.type === 'ITEM' || s.type === 'RECTANGLE' || s.type === 'TEXTBOX';
  });

  if (!group) {
    if (groupable.length < 2) return null;
    return (
      <PanelSection title="Group">
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            groupSelection(selection);
          }}
        >
          Group ({shortcutHint(KEYMAP, 'group')})
        </Button>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Group">
      <Stack spacing={1.5}>
        <NameField
          key={`${group.id}:${group.name ?? ''}`}
          initial={group.name ?? ''}
          onCommit={(value) => {
            updateGroup(group.id, { name: value || undefined });
          }}
        />
        <ColorSelector
          activeColor={
            colors.find((c) => {
              return c.value === group.color;
            })?.id
          }
          onChange={(colorId) => {
            const found = colors.find((c) => {
              return c.id === colorId;
            })?.value;
            // The schema stores a 6-digit hex; skip anything else.
            const value =
              found && /^#[0-9a-f]{6}$/i.test(found) ? found : undefined;
            updateGroup(group.id, {
              color: value === group.color ? undefined : value
            });
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            // lw-062: collapsing the group being worked inside leaves it.
            if (
              !group.collapsed &&
              editingGroupId &&
              groupChain(currentView, editingGroupId).includes(group.id)
            ) {
              setEditingGroupId(null);
            }
            updateGroup(group.id, {
              collapsed: group.collapsed ? undefined : true
            });
          }}
        >
          {group.collapsed ? 'Expand' : 'Collapse'}
        </Button>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {group.collapsed
            ? 'Double-click the box to expand it.'
            : 'Double-click a member to work inside the group.'}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            ungroupSelection(selection);
          }}
        >
          Ungroup ({shortcutHint(KEYMAP, 'ungroup')})
        </Button>
      </Stack>
    </PanelSection>
  );
};
