# SVG Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Export as SVG" to the main menu with two download formats: a true-flat vector SVG and a foreignObject universal SVG, in a single dialog with a background-colour picker.

**Architecture:** A new `ExportSvgDialog` mirrors the existing `ExportImageDialog` pattern: it mounts an off-screen `<Isoflow>` instance, waits for `onModelUpdated`, then enables two download buttons. Two new utilities in `exportOptions.ts` handle the actual export — one DOM-walking vector SVG and one `html-to-image.toSvg()` universal SVG. The feature is wired through a new `EXPORT.SVG` menu option and a new `EXPORT_SVG` dialog type.

**Tech Stack:** React, Zustand, MUI, TypeScript, html-to-image (`toSvg`), Jest/RTL

---

## Context

Spec: `docs/superpowers/specs/2026-05-30-svg-export-design.md`

Feature ID series: FEA13.

The `ExportImageDialog` at `src/components/ExportImageDialog/ExportImageDialog.tsx` is the canonical pattern to mirror. Key exports already in `src/utils/exportOptions.ts`: `generateGenericFilename`, `downloadFile`. The `html-to-image` package is already installed (version ^1.11.13) and exports `toSvg`.

`MainMenuOptionsEnum` lives in `src/types/common.ts:34`. `DialogTypeEnum` lives in `src/types/ui.ts:120`. `MAIN_MENU_OPTIONS` constant lives in `src/config.ts:141`. `ColorPicker` is at `src/components/ColorSelector/ColorPicker`. `useDiagramUtils` (for `getUnprojectedBounds`) is at `src/hooks/useDiagramUtils`.

**Vector SVG approach:** The DOM has two patterns for positioned scene content:
1. **IsoTileArea** (rectangles): the `<svg>` element itself has `style.position === 'absolute'` and `style.transform === 'matrix(...)'`
2. **Connectors**: a `<div>` has `style.position === 'absolute'` with the CSS transform, and contains a direct `<svg>` child

The isometric matrix `matrix(0.707, -0.409, 0.707, 0.409, 0, -0.816)` is the same in CSS and SVG `transform=""` — values map directly. Node icons are `<img>` elements with visual position captured via `getBoundingClientRect()`.

---

## File Map

| Action | Path |
|--------|------|
| **Modify** | `src/types/common.ts` — add `'EXPORT.SVG'` to `MainMenuOptionsEnum` |
| **Modify** | `src/types/ui.ts` — add `EXPORT_SVG` to `DialogTypeEnum` |
| **Modify** | `src/utils/exportOptions.ts` — add `exportAsVectorSvg`, `exportAsUniversalSvg` |
| **Create** | `src/components/ExportSvgDialog/ExportSvgDialog.tsx` |
| **Modify** | `src/config.ts` — add `'EXPORT.SVG'` to `MAIN_MENU_OPTIONS` |
| **Modify** | `src/components/MainMenu/MainMenu.tsx` — add `EXPORT.SVG` handler |
| **Modify** | `src/components/UiOverlay/DialogLayer.tsx` — render `ExportSvgDialog` |
| **Create** | `src/__tests__/Isoflow.fea13-01.test.tsx` |
| **Modify** | `docs/embedding.md` |
| **Modify** | `README.md` |

---

## Task 1: Extend `MainMenuOptionsEnum` and `DialogTypeEnum`

**Files:**
- Modify: `src/types/common.ts` (lines 34–43)
- Modify: `src/types/ui.ts` (lines 120–123)

- [ ] **Step 1: Add `'EXPORT.SVG'` to `MainMenuOptionsEnum`**

  In `src/types/common.ts`, replace the enum block (lines 34–43):

  ```typescript
  export const MainMenuOptionsEnum = {
    'ACTION.OPEN': 'ACTION.OPEN',
    'ACTION.SAVE': 'ACTION.SAVE',
    'EXPORT.JSON': 'EXPORT.JSON',
    'EXPORT.PNG': 'EXPORT.PNG',
    'EXPORT.PDF': 'EXPORT.PDF',
    'EXPORT.SVG': 'EXPORT.SVG',
    'ACTION.CLEAR_CANVAS': 'ACTION.CLEAR_CANVAS',
    'LINK.GITHUB': 'LINK.GITHUB',
    VERSION: 'VERSION'
  } as const;
  ```

- [ ] **Step 2: Add `EXPORT_SVG` to `DialogTypeEnum`**

  In `src/types/ui.ts`, replace the enum block (lines 120–123):

  ```typescript
  export const DialogTypeEnum = {
    EXPORT_IMAGE: 'EXPORT_IMAGE',
    EXPORT_SVG: 'EXPORT_SVG',
    KEYBOARD_SHORTCUTS: 'KEYBOARD_SHORTCUTS'
  } as const;
  ```

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors (no new consumers yet).

- [ ] **Step 4: Commit**

  ```bash
  git add src/types/common.ts src/types/ui.ts
  git commit -m "feat(FEA13-01): add EXPORT.SVG menu option and EXPORT_SVG dialog type"
  ```

---

## Task 2: Add `exportAsVectorSvg` and `exportAsUniversalSvg` to `exportOptions.ts`

**Files:**
- Modify: `src/utils/exportOptions.ts` (add after line 133, end of file)

- [ ] **Step 1: Add the two export functions**

  Append to the end of `src/utils/exportOptions.ts`:

  ```typescript
  /**
   * Convert an <img> src to a base64 data URI. Returns the src unchanged
   * if it is already a data URI.
   */
  const fetchAsDataUri = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;
    const res = await fetch(src);
    const fetchedBlob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fetchedBlob);
    });
  };

  /**
   * Export the rendered scene as a true-flat SVG by walking the live DOM
   * and lifting scene SVG elements into a root <svg>. Icons are inlined as
   * data: URIs. Animated connectors become static (animateMotion stripped).
   * TextBox text is not captured (use exportAsUniversalSvg for full fidelity).
   *
   * Two DOM patterns are handled:
   *   - IsoTileArea: the <svg> element itself carries position:absolute + CSS matrix
   *   - Connectors:  a <div> carries position:absolute + CSS matrix; its direct child is the <svg>
   */
  export const exportAsVectorSvg = async (
    el: HTMLElement,
    bgColor: string
  ): Promise<void> => {
    const ns = 'http://www.w3.org/2000/svg';
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    const root = document.createElementNS(ns, 'svg');
    root.setAttribute('xmlns', ns);
    root.setAttribute('viewBox', `0 0 ${w} ${h}`);
    root.setAttribute('width', String(w));
    root.setAttribute('height', String(h));

    if (bgColor && bgColor !== 'transparent') {
      const bg = document.createElementNS(ns, 'rect');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', bgColor);
      root.appendChild(bg);
    }

    // Pattern 1: <svg style="position:absolute; left:X; top:Y; transform:matrix(...)">
    el.querySelectorAll<SVGSVGElement>('svg').forEach((svgEl) => {
      if (svgEl.style.position !== 'absolute') return;
      const x = parseFloat(svgEl.style.left) || 0;
      const y = parseFloat(svgEl.style.top) || 0;
      const cssTransform = svgEl.style.transform || '';
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll('animateMotion').forEach((a) => a.remove());
      // Strip position CSS — placement is now via the <g> transform.
      clone.style.position = '';
      clone.style.left = '';
      clone.style.top = '';
      clone.style.transform = '';
      clone.style.transformOrigin = '';
      const g = document.createElementNS(ns, 'g');
      g.setAttribute(
        'transform',
        `translate(${x} ${y})${cssTransform ? ` ${cssTransform}` : ''}`
      );
      g.appendChild(clone);
      root.appendChild(g);
    });

    // Pattern 2: <div style="position:absolute; left:X; top:Y; transform:matrix(...)"><svg>...</svg></div>
    el.querySelectorAll<HTMLElement>('div').forEach((divEl) => {
      if (divEl.style.position !== 'absolute') return;
      const svgChild = divEl.querySelector<SVGSVGElement>(':scope > svg');
      if (!svgChild) return;
      // Skip IsoTileArea SVGs already handled in Pattern 1.
      if (svgChild.style.position === 'absolute') return;
      const x = parseFloat(divEl.style.left) || 0;
      const y = parseFloat(divEl.style.top) || 0;
      const cssTransform = divEl.style.transform || '';
      const clone = svgChild.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll('animateMotion').forEach((a) => a.remove());
      const g = document.createElementNS(ns, 'g');
      g.setAttribute(
        'transform',
        `translate(${x} ${y})${cssTransform ? ` ${cssTransform}` : ''}`
      );
      g.appendChild(clone);
      root.appendChild(g);
    });

    // Icons: <img> elements — convert to <image href="data:...">
    const containerRect = el.getBoundingClientRect();
    const imgPromises = Array.from(
      el.querySelectorAll<HTMLImageElement>('img')
    ).map(async (imgEl) => {
      try {
        const rect = imgEl.getBoundingClientRect();
        const dataUri = await fetchAsDataUri(imgEl.src);
        const imageEl = document.createElementNS(ns, 'image');
        imageEl.setAttribute('x', String(rect.left - containerRect.left));
        imageEl.setAttribute('y', String(rect.top - containerRect.top));
        imageEl.setAttribute('width', String(rect.width));
        imageEl.setAttribute('height', String(rect.height));
        imageEl.setAttribute('href', dataUri);
        root.appendChild(imageEl);
      } catch {
        // Skip icons that cannot be fetched.
      }
    });
    await Promise.all(imgPromises);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(root);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadFile(blob, generateGenericFilename('svg'));
  };

  /**
   * Export the rendered scene as a foreignObject SVG using html-to-image.
   * External images are inlined as data: URIs automatically. The output
   * is a self-contained SVG that renders in any browser and in Figma.
   * Not editable as individual vector shapes in Illustrator/Inkscape.
   */
  export const exportAsUniversalSvg = async (
    el: HTMLElement,
    bgColor: string
  ): Promise<void> => {
    const { toSvg } = await import('html-to-image');
    const prevBg = el.style.background;
    el.style.background = bgColor;
    try {
      const dataUrl = await toSvg(el, { cacheBust: true });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadFile(blob, generateGenericFilename('svg'));
    } finally {
      el.style.background = prevBg;
    }
  };
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors in exportOptions.ts.

- [ ] **Step 3: Run tests to confirm no regressions**

  ```bash
  npx jest --no-coverage 2>&1 | tail -10
  ```

  Expected: all existing tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add src/utils/exportOptions.ts
  git commit -m "feat(FEA13-01): add exportAsVectorSvg and exportAsUniversalSvg utilities"
  ```

---

## Task 3: Create `ExportSvgDialog` component

**Files:**
- Create: `src/components/ExportSvgDialog/ExportSvgDialog.tsx`

- [ ] **Step 1: Create the component file**

  Create `src/components/ExportSvgDialog/ExportSvgDialog.tsx`:

  ```typescript
  import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
  import {
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    Button,
    Stack,
    Alert,
    FormControlLabel,
    Typography
  } from '@mui/material';
  import { useShallow } from 'zustand/shallow';
  import { useModelStore } from 'src/stores/modelStore';
  import {
    exportAsVectorSvg,
    exportAsUniversalSvg,
    modelFromModelStore
  } from 'src/utils';
  import { ModelStore } from 'src/types';
  import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
  import { useUiStateStore } from 'src/stores/uiStateStore';
  import { Isoflow } from 'src/Isoflow';
  import { Loader } from 'src/components/Loader/Loader';
  import { createIsoflowTheme } from 'src/styles/theme';
  import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';

  interface Props {
    onClose: () => void;
  }

  export const ExportSvgDialog = ({ onClose }: Props) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const currentView = useUiStateStore((state) => state.view);
    const [isReady, setIsReady] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { getUnprojectedBounds } = useDiagramUtils();
    const uiStateActions = useUiStateStore((state) => state.actions);
    const exportTheme = useUiStateStore((state) => state.exportTheme);
    const model = useModelStore(
      useShallow((state): Omit<ModelStore, 'actions'> => {
        return modelFromModelStore(state);
      })
    );

    const unprojectedBounds = useMemo(() => {
      return getUnprojectedBounds();
    }, [getUnprojectedBounds]);

    useEffect(() => {
      uiStateActions.setMode({
        type: 'INTERACTIONS_DISABLED',
        showCursor: false
      });
    }, [uiStateActions]);

    const onModelReady = useCallback(() => {
      // Only fire once — subsequent onModelUpdated calls are ignored.
      setIsReady((prev) => {
        if (prev) return prev;
        return true;
      });
    }, []);

    const [backgroundColor, setBackgroundColor] = useState<string>(() => {
      return createIsoflowTheme(exportTheme).customVars.customPalette.diagramBg;
    });
    const [transparent, setTransparent] = useState(false);

    const effectiveBgColor = transparent ? 'transparent' : backgroundColor;

    const handleDownloadVector = useCallback(async () => {
      if (!containerRef.current) return;
      setIsExporting(true);
      setExportError(null);
      try {
        await exportAsVectorSvg(containerRef.current, effectiveBgColor);
      } catch (err) {
        setExportError(
          err instanceof Error ? err.message : 'Vector SVG export failed.'
        );
      } finally {
        setIsExporting(false);
      }
    }, [effectiveBgColor]);

    const handleDownloadUniversal = useCallback(async () => {
      if (!containerRef.current) return;
      setIsExporting(true);
      setExportError(null);
      try {
        await exportAsUniversalSvg(containerRef.current, effectiveBgColor);
      } catch (err) {
        setExportError(
          err instanceof Error ? err.message : 'Universal SVG export failed.'
        );
      } finally {
        setIsExporting(false);
      }
    }, [effectiveBgColor]);

    return (
      <Dialog open onClose={onClose}>
        <DialogTitle>Export as SVG</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box
              sx={{
                position: 'absolute',
                width: 0,
                height: 0,
                overflow: 'hidden'
              }}
            >
              <Box
                ref={containerRef}
                sx={{ position: 'absolute', top: 0, left: 0 }}
                style={{
                  width: unprojectedBounds.width,
                  height: unprojectedBounds.height
                }}
              >
                <Isoflow
                  editorMode="NON_INTERACTIVE"
                  onModelUpdated={onModelReady}
                  initialData={{
                    ...model,
                    fitToView: true,
                    view: currentView
                  }}
                />
              </Box>
            </Box>

            {!isReady && (
              <Box
                sx={{
                  position: 'relative',
                  width: 500,
                  height: 300,
                  bgcolor: 'background.paper'
                }}
              >
                <Loader size={2} />
              </Box>
            )}

            {isReady && (
              <>
                <Box sx={{ width: '100%' }}>
                  <Box component="fieldset">
                    <Typography variant="caption" component="legend">
                      Options
                    </Typography>
                    <FormControlLabel
                      label="Transparent background"
                      control={
                        <input
                          type="checkbox"
                          checked={transparent}
                          onChange={(e) => setTransparent(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                      }
                    />
                    {!transparent && (
                      <FormControlLabel
                        label="Background color"
                        control={
                          <ColorPicker
                            value={backgroundColor}
                            onChange={setBackgroundColor}
                          />
                        }
                      />
                    )}
                  </Box>
                </Box>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: 'flex-end' }}
                >
                  <Button variant="text" onClick={onClose} disabled={isExporting}>
                    Cancel
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleDownloadVector}
                    disabled={isExporting}
                  >
                    Download vector SVG
                  </Button>
                  <Button
                    onClick={handleDownloadUniversal}
                    disabled={isExporting}
                  >
                    Download universal SVG
                  </Button>
                </Stack>
              </>
            )}

            {exportError && (
              <Alert severity="error">{exportError}</Alert>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    );
  };
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors. If `exportAsVectorSvg` / `exportAsUniversalSvg` aren't yet re-exported from `src/utils`, add them in the next step — the type-check will tell you.

- [ ] **Step 3: Verify `src/utils/index.ts` re-exports the new functions**

  Run:
  ```bash
  grep "exportAsVectorSvg\|exportAsUniversalSvg" /Users/adam/Projects/isoflow/src/utils/index.ts
  ```

  If the output is empty, `src/utils/index.ts` uses a wildcard re-export and you need to check whether `exportOptions.ts` is included. If it is not auto-included, add:

  ```typescript
  export { exportAsVectorSvg, exportAsUniversalSvg } from './exportOptions';
  ```

  Run type-check again after any change.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/ExportSvgDialog/ExportSvgDialog.tsx
  git commit -m "feat(FEA13-01): create ExportSvgDialog component"
  ```

---

## Task 4: Wire the menu entry and dialog layer

**Files:**
- Modify: `src/config.ts` (line 141–149)
- Modify: `src/components/MainMenu/MainMenu.tsx`
- Modify: `src/components/UiOverlay/DialogLayer.tsx`

- [ ] **Step 1: Add `'EXPORT.SVG'` to `MAIN_MENU_OPTIONS` in `src/config.ts`**

  In `src/config.ts`, replace the `MAIN_MENU_OPTIONS` constant (lines 141–149):

  ```typescript
  export const MAIN_MENU_OPTIONS: MainMenuOptions = [
    'ACTION.OPEN',
    'EXPORT.JSON',
    'EXPORT.PNG',
    'EXPORT.PDF',
    'EXPORT.SVG',
    'ACTION.CLEAR_CANVAS',
    'LINK.GITHUB',
    'VERSION'
  ];
  ```

- [ ] **Step 2: Add the SVG import and handler in `MainMenu.tsx`**

  In `src/components/MainMenu/MainMenu.tsx`, add `PolylineOutlined as ExportSvgIcon` to the existing icon import block (around line 18):

  ```typescript
  import {
    // ... existing icons ...
    PolylineOutlined as ExportSvgIcon
  } from '@mui/icons-material';
  ```

  After the `onExportAsImage` callback (line ~106), add:

  ```typescript
    const onExportAsSvg = useCallback(() => {
      uiStateActions.setIsMainMenuOpen(false);
      uiStateActions.setDialog('EXPORT_SVG');
    }, [uiStateActions]);
  ```

  After the `EXPORT.PDF` menu item (line ~267–270), add:

  ```typescript
            {mainMenuOptions.includes('EXPORT.SVG') && (
              <MenuItem onClick={onExportAsSvg} Icon={<ExportSvgIcon />}>
                Export as SVG
              </MenuItem>
            )}
  ```

- [ ] **Step 3: Add `ExportSvgDialog` to `DialogLayer.tsx`**

  In `src/components/UiOverlay/DialogLayer.tsx`, add the import (after the `ExportImageDialog` import, line 15):

  ```typescript
  import { ExportSvgDialog } from 'src/components/ExportSvgDialog/ExportSvgDialog';
  ```

  After the `EXPORT_IMAGE` dialog block (line 45–47), add:

  ```typescript
        {dialog === 'EXPORT_SVG' && (
          <ExportSvgDialog onClose={onCloseDialog} />
        )}
  ```

- [ ] **Step 4: Type-check and run tests**

  ```bash
  npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -10
  ```

  Expected: no TS errors, all existing tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/config.ts src/components/MainMenu/MainMenu.tsx src/components/UiOverlay/DialogLayer.tsx
  git commit -m "feat(FEA13-01): wire Export as SVG menu entry and dialog layer"
  ```

---

## Task 5: Write smoke tests

**Files:**
- Create: `src/__tests__/Isoflow.fea13-01.test.tsx`

- [ ] **Step 1: Write the test file**

  Create `src/__tests__/Isoflow.fea13-01.test.tsx`:

  ```typescript
  /**
   * @jest-environment jsdom
   */
  import { render, cleanup } from '@testing-library/react';
  import Isoflow from '../Isoflow';
  import type { InitialData } from 'src/types';

  beforeAll(() => {
    if (!('ResizeObserver' in globalThis)) {
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        };
    }
    if (!Element.prototype.scrollTo) {
      Element.prototype.scrollTo = () => {};
    }
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false
        })
      });
    }
  });

  afterEach(() => {
    cleanup();
  });

  const initialData: InitialData = {
    version: '',
    title: 'FEA13-01 fixture',
    icons: [],
    colors: [{ id: 'col-1', value: '#4A90D9' }],
    items: [
      { id: 'node-a', name: 'Alpha' },
      { id: 'node-b', name: 'Beta' }
    ],
    views: [
      {
        id: 'view-1',
        name: 'View 1',
        items: [
          { id: 'node-a', tile: { x: 0, y: 0 } },
          { id: 'node-b', tile: { x: 4, y: 0 } }
        ],
        connectors: [
          {
            id: 'conn-1',
            color: 'col-1',
            anchors: [
              { id: 'a-start', ref: { item: 'node-a' } },
              { id: 'a-end', ref: { item: 'node-b' } }
            ]
          }
        ]
      }
    ]
  };

  describe('FEA13-01 SVG export menu option', () => {
    test('renders without error with EXPORT.SVG in mainMenuOptions', () => {
      const onError = jest.fn();
      render(
        <Isoflow
          onError={onError}
          initialData={initialData}
          mainMenuOptions={['EXPORT.SVG']}
        />
      );
      expect(onError).not.toHaveBeenCalled();
    });

    test('renders without error with full default menu', () => {
      const onError = jest.fn();
      render(
        <Isoflow
          onError={onError}
          initialData={initialData}
        />
      );
      expect(onError).not.toHaveBeenCalled();
    });

    test('renders without error with EXPORT.SVG alongside PNG and PDF', () => {
      const onError = jest.fn();
      render(
        <Isoflow
          onError={onError}
          initialData={initialData}
          mainMenuOptions={['EXPORT.PNG', 'EXPORT.PDF', 'EXPORT.SVG']}
        />
      );
      expect(onError).not.toHaveBeenCalled();
    });

    test('renders without error with empty mainMenuOptions', () => {
      const onError = jest.fn();
      render(
        <Isoflow
          onError={onError}
          initialData={initialData}
          mainMenuOptions={[]}
        />
      );
      expect(onError).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 2: Run the new tests**

  ```bash
  npx jest --no-coverage src/__tests__/Isoflow.fea13-01.test.tsx 2>&1 | tail -20
  ```

  Expected: all 4 tests PASS.

- [ ] **Step 3: Run the full test suite**

  ```bash
  npx jest --no-coverage 2>&1 | tail -10
  ```

  Expected: all tests green.

- [ ] **Step 4: Commit**

  ```bash
  git add src/__tests__/Isoflow.fea13-01.test.tsx
  git commit -m "test(FEA13-01): smoke tests for EXPORT.SVG menu option"
  ```

---

## Task 6: Update documentation

**Files:**
- Modify: `docs/embedding.md`
- Modify: `README.md`

- [ ] **Step 1: Add `EXPORT.SVG` to the main menu table in `docs/embedding.md`**

  In `docs/embedding.md`, find the main menu items table (around line 208–210). After the `EXPORT.PDF` row, add:

  ```markdown
  | `'EXPORT.SVG'` | Export the diagram as SVG. Opens a dialog with background colour picker and two download buttons: **vector SVG** (true-flat, Illustrator/Inkscape/Figma compatible — text boxes not captured) and **universal SVG** (foreignObject, full-fidelity in browsers and Figma) |
  ```

- [ ] **Step 2: Update the feature list in `README.md`**

  In `README.md`, find the export features line (around line 51):

  ```
  - **Export options** — Export diagrams as JSON, PNG, or PDF from the main menu. PDF generation is client-side via jsPDF (no network call).
  ```

  Replace with:

  ```
  - **Export options** — Export diagrams as JSON, PNG, PDF, or SVG from the main menu. PDF generation is client-side via jsPDF; SVG export offers two formats: a true-flat vector SVG (Illustrator/Inkscape/Figma) and a foreignObject universal SVG (full-fidelity in browsers and Figma). All exports are client-side with no network calls.
  ```

- [ ] **Step 3: Mark SVG export as done in the planned features section of `README.md`**

  In `README.md`, find the "SVG export" heading in the planned features section (around line 78). Change the section header or add a note indicating it is now shipped. For example, add `*(shipped in FEA13-01)*` after the heading:

  ```markdown
  ### SVG export *(shipped in FEA13-01)*
  ```

- [ ] **Step 4: Type-check and full test run**

  ```bash
  npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -10 && npm run lint 2>&1 | tail -20
  ```

  Expected: 0 TS errors, all tests green, lint clean.

- [ ] **Step 5: Commit**

  ```bash
  git add docs/embedding.md README.md
  git commit -m "docs(FEA13-01): document EXPORT.SVG menu option and update feature list"
  ```

---

## Verification

- [ ] **Run full checks**

  ```bash
  npx tsc --noEmit && npx jest --no-coverage && npm run lint
  ```

- [ ] **Manual browser check**

  1. Open http://localhost:2222
  2. Add two nodes and a connector
  3. Open the main menu — confirm "Export as SVG" appears between "Export as PDF" and "Clear"
  4. Click "Export as SVG" — a dialog appears with a loader, then options
  5. Check/uncheck "Transparent background" — background colour picker appears/disappears
  6. Click "Download vector SVG" — a `.svg` file downloads; open in Inkscape/Illustrator/Figma to confirm shapes are present
  7. Click "Download universal SVG" — a `.svg` file downloads; open in browser to confirm full-fidelity rendering
  8. Press Cancel — dialog closes cleanly

---

## Self-Review Notes

- `EXPORT.SVG` is placed after `EXPORT.PDF` in both the enum and the `MAIN_MENU_OPTIONS` array — consistent ordering
- `ExportSvgDialog` does NOT debounce like `ExportImageDialog` because SVG export is on-demand (user clicks button) rather than auto-triggered
- `onModelReady` uses a functional `setState` updater to avoid firing more than once — safe against rapid model updates during the Isoflow init phase
- `exportAsUniversalSvg` uses a dynamic `import('html-to-image')` to keep the initial bundle lighter
- Vector SVG does not capture TextBox text — this is documented in embedding.md and is a v1 limitation
- `fetchAsDataUri` handles already-inlined `data:` URIs as a no-op, making it safe for icons that are already base64
- The `transparent` toggle is a simple checkbox (not MUI `Checkbox`) to avoid importing additional MUI components — the `FormControlLabel` wrapper keeps visual consistency
