import { useCallback } from 'react';
import type { Group, ItemReference } from 'src/types';
import * as reducers from 'src/stores/reducers';
import { useUiStateStore } from 'src/stores/uiStateStore';
import {
  generateId,
  groupChain,
  groupMatchingSelection,
  groupMembers
} from 'src/utils';
import type { SceneCore } from './types';

// group and ungroup the selection (Ctrl+G / Ctrl+Shift+G and
// the multi-select panel), and rename or colour a group.
export const useSceneGroups = ({
  getState,
  setState,
  currentViewId,
  currentView
}: Pick<
  SceneCore,
  'getState' | 'setState' | 'currentViewId' | 'currentView'
>) => {
  const editingGroupId = useUiStateStore((state) => {
    return state.editingGroupId;
  });

  /** Returns the new group's id, or null when there was nothing to group. */
  const groupSelection = useCallback(
    (refs: ItemReference[]): string | null => {
      const id = generateId();
      const before = getState();
      const next = reducers.view({
        action: 'CREATE_GROUP',
        payload: {
          group: { id, parentGroupId: editingGroupId ?? undefined },
          refs
        },
        ctx: { viewId: currentViewId, state: before }
      });
      if (next.model === before.model) return null;
      setState(next);
      return id;
    },
    [getState, setState, currentViewId, editingGroupId]
  );

  /**
   * Dissolve the group the selection is, or else every outermost group
   * lying wholly inside the selection. Returns how many were dissolved.
   */
  const ungroupSelection = useCallback(
    (refs: ItemReference[]): number => {
      const exact = groupMatchingSelection(currentView, refs);
      let targets: string[];
      if (exact) {
        targets = [exact];
      } else {
        const key = (r: ItemReference) => {
          return `${r.type}:${r.id}`;
        };
        const selected = new Set(refs.map(key));
        const inside = (currentView.groups ?? [])
          .filter((g) => {
            const members = groupMembers(currentView, g.id);
            return (
              members.length > 0 &&
              members.every((m) => {
                return selected.has(key(m));
              })
            );
          })
          .map((g) => {
            return g.id;
          });
        targets = inside.filter((id) => {
          const chain = groupChain(currentView, id);
          return !chain.slice(0, -1).some((ancestor) => {
            return inside.includes(ancestor);
          });
        });
      }
      if (targets.length === 0) return 0;
      let state = getState();
      for (const id of targets) {
        state = reducers.view({
          action: 'UNGROUP',
          payload: { id },
          ctx: { viewId: currentViewId, state }
        });
      }
      setState(state);
      return targets.length;
    },
    [getState, setState, currentViewId, currentView]
  );

  const updateGroup = useCallback(
    (id: string, updates: Partial<Pick<Group, 'name' | 'color'>>) => {
      setState(
        reducers.view({
          action: 'UPDATE_GROUP',
          payload: { id, ...updates },
          ctx: { viewId: currentViewId, state: getState() }
        })
      );
    },
    [getState, setState, currentViewId]
  );

  return { groupSelection, ungroupSelection, updateGroup };
};
