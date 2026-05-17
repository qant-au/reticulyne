import { Grid } from '@mui/material';
import { IconCollectionStateWithIcons, Icon } from 'src/types';
import { IconCollection } from './IconCollection';

interface Props {
  iconCategories: IconCollectionStateWithIcons[];
  onClick?: (icon: Icon) => void;
  onMouseDown?: (icon: Icon) => void;
}

export const Icons = ({ iconCategories, onClick, onMouseDown }: Props) => {
  return (
    <Grid container spacing={1} sx={{ py: 2 }}>
      {iconCategories.map((cat) => {
        return (
          <Grid key={`icon-collection-${cat.id ?? 'uncategorised'}`} size={12}>
            <IconCollection
              {...cat}
              onClick={onClick}
              onMouseDown={onMouseDown}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};
