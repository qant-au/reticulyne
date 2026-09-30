import { useCallback } from 'react';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getTilePosition, CoordsUtils, isLocked } from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { ContextMenu } from 'src/vendor/accurona-ui';
import type { ContextMenuItem } from 'src/vendor/accurona-ui';

interface Props {
  anchorEl?: HTMLElement;
}

export const ContextMenuManager = ({ anchorEl }: Props) => {
  const scene = useScene();
  const zoom = useUiStateStore((state) => {
    return state.zoom;
  });
  const contextMenu = useUiStateStore((state) => {
    return state.contextMenu;
  });

  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });

  const onClose = useCallback(() => {
    uiStateActions.setContextMenu(null);
  }, [uiStateActions]);

  if (!contextMenu) {
    return null;
  }

  const { item } = contextMenu;
  const close = (action: () => void) => {
    return () => {
      action();
      onClose();
    };
  };

  // lw-069: a locked item offers only Unlock; the empty canvas offers
  // Unlock all (it opens only when something is locked).
  const items: ContextMenuItem[] = !item
    ? [
        {
          label: 'Unlock all',
          onClick: close(() => {
            scene.setItemsLocked('all', false);
          })
        }
      ]
    : isLocked(scene.currentView, item)
      ? [
          {
            label: 'Unlock',
            onClick: close(() => {
              scene.setItemsLocked([item], false);
            })
          }
        ]
      : [
          // lw-068: the keyboard's way to draw a connector.
          ...(item.type === 'ITEM'
            ? [
                {
                  label: 'Connect to…',
                  onClick: close(() => {
                    uiStateActions.setSelection([item]);
                    uiStateActions.setDialog('CONNECT_TO');
                  })
                }
              ]
            : []),
          ...(item.type === 'ITEM' ||
          item.type === 'TEXTBOX' ||
          item.type === 'RECTANGLE'
            ? [
                {
                  label: 'Duplicate',
                  onClick: close(() => {
                    scene.duplicateItem(item);
                  })
                }
              ]
            : []),
          // Nodes are depth-sorted, so they get no layer order.
          ...(item.type !== 'ITEM'
            ? [
                {
                  label: 'Send backward',
                  onClick: close(() => {
                    scene.changeLayerOrder('SEND_BACKWARD', item);
                  })
                },
                {
                  label: 'Bring forward',
                  onClick: close(() => {
                    scene.changeLayerOrder('BRING_FORWARD', item);
                  })
                },
                {
                  label: 'Send to back',
                  onClick: close(() => {
                    scene.changeLayerOrder('SEND_TO_BACK', item);
                  })
                },
                {
                  label: 'Bring to front',
                  onClick: close(() => {
                    scene.changeLayerOrder('BRING_TO_FRONT', item);
                  })
                }
              ]
            : []),
          {
            label: 'Lock',
            onClick: close(() => {
              scene.setItemsLocked([item], true);
              uiStateActions.setSelection([]);
              uiStateActions.setItemControls(null);
            })
          }
        ];

  return (
    <ContextMenu
      anchorEl={anchorEl}
      onClose={onClose}
      position={CoordsUtils.multiply(
        getTilePosition({
          tile: contextMenu.tile,
          projection: scene.projection
        }),
        zoom
      )}
      items={items}
    />
  );
};
