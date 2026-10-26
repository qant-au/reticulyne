import { Grid } from '@mui/material';
import { IconCollectionStateWithIcons, Icon } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { IconCollection } from './IconCollection';

interface Props {
  iconCategories: IconCollectionStateWithIcons[];
  onClick?: (icon: Icon) => void;
  onMouseDown?: (icon: Icon) => void;
}

export const Icons = ({ iconCategories, onClick, onMouseDown }: Props) => {
  // A pack's icons are filed under the pack's id (which iconCollections
  // allows and denies); the section is headed with the pack's name.
  const packs = useUiStateStore((state) => {
    return state.packs;
  });
  const packName = (id: string | undefined) => {
    return packs.find((p) => {
      return p.pack.id === id;
    })?.pack.name;
  };
  return (
    <Grid container spacing={1} sx={{ py: 2 }}>
      {iconCategories.map((cat) => {
        return (
          <Grid key={`icon-collection-${cat.id ?? 'uncategorised'}`} size={12}>
            <IconCollection
              {...cat}
              label={packName(cat.id)}
              onClick={onClick}
              onMouseDown={onMouseDown}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};
