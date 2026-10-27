import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import {
  renderDiagram,
  type Viewer,
  type ViewerProjection,
  type ViewerView
} from 'src/viewer';
import { SAMPLES } from 'src/viewer/demo/samples';
import { useExamplesThemeMode } from '../themeModeContext';

// The read-only viewer (@reticulyne/editor/viewer) in a React app: the
// viewer itself loads no React or MUI, so the host mounts it into a <div>
// and drives it through its API. Pick a sample, a floor and how it is
// drawn; the examples' theme setting picks the canvas. viewer.html has the
// same viewer on a page with no React at all.

export const ReadonlyViewer = () => {
  const box = useRef<HTMLDivElement | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [views, setViews] = useState<ViewerView[]>([]);
  const [viewId, setViewId] = useState('');
  const [projection, setProjection] = useState<ViewerProjection | ''>('');
  const { themeMode } = useExamplesThemeMode();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme =
    themeMode === 'auto' ? (prefersDark ? 'dark' : 'light') : themeMode;

  const sample = useMemo(() => {
    return (
      SAMPLES.find((s) => {
        return s.id === sampleId;
      }) ?? SAMPLES[0]
    );
  }, [sampleId]);

  // A new viewer for each diagram; the floor, projection and theme are
  // changed on the one there is.
  useEffect(() => {
    if (!box.current) return undefined;
    const created = renderDiagram(box.current, sample.scene, {
      onViewChange: setViewId
    });
    viewer.current = created;
    setViews(created.views);
    setViewId(created.view);
    return () => {
      created.destroy();
      viewer.current = null;
    };
  }, [sample]);

  useEffect(() => {
    void viewer.current?.setTheme(theme);
  }, [theme, sample]);

  useEffect(() => {
    void viewer.current?.setProjection(projection || undefined);
  }, [projection, sample]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: 'wrap',
          alignItems: 'center',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="viewer-sample">Diagram</InputLabel>
          <Select
            labelId="viewer-sample"
            label="Diagram"
            value={sampleId}
            onChange={(e) => {
              setSampleId(e.target.value);
            }}
          >
            {SAMPLES.map((s) => {
              return (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        {views.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="viewer-floor">Floor</InputLabel>
            <Select
              labelId="viewer-floor"
              label="Floor"
              value={viewId}
              onChange={(e) => {
                setViewId(e.target.value);
                void viewer.current?.setView(e.target.value);
              }}
            >
              {views.map((v) => {
                return (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="viewer-projection">Drawn</InputLabel>
          <Select
            labelId="viewer-projection"
            label="Drawn"
            value={projection}
            onChange={(e) => {
              setProjection(e.target.value as ViewerProjection | '');
            }}
          >
            <MenuItem value="">Each view as saved</MenuItem>
            <MenuItem value="iso">Isometric</MenuItem>
            <MenuItem value="flat">Flat</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          The viewer draws read-only, with no React.{' '}
          <Link href="viewer.html" target="_blank" rel="noopener">
            Open it on a page of its own
          </Link>
        </Typography>
      </Stack>
      <Box
        ref={box}
        data-testid="viewer-example"
        sx={{ flex: 1, minHeight: 0, position: 'relative' }}
      />
    </Box>
  );
};
