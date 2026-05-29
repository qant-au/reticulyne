# SVG Export Design

**Feature ID:** FEA13-01  
**Date:** 2026-05-30  
**Status:** Approved

---

## Goal

Add "Export as SVG" to the main menu, producing two formats from a single dialog: a true-flat vector SVG (Illustrator / Inkscape / Figma compatible) and a universal foreignObject SVG (browser / web embed compatible).

---

## Background

The existing export surface offers PNG (`exportAsImage`) and PDF (`exportAsPdf`). Both use an off-screen `<Isoflow>` instance to render at the correct export theme before capturing. SVG export follows the same pattern but splits into two output formats because no single SVG encoding satisfies both "editable in vector tools" and "portable across browsers."

---

## Architecture

A new `ExportSvgDialog` mounts an off-screen `<Isoflow exportTheme="light" editorMode="NON_INTERACTIVE">` instance (identical to `ExportImageDialog`). Once the instance signals ready, the user can choose a background colour and click either of two download buttons. Each button calls a dedicated export utility in `src/utils/exportOptions.ts`.

The dialog is triggered from the main menu via a new `EXPORT.SVG` menu option and a new `EXPORT_SVG` dialog type. No changes to the store shape, prop API, or render pipeline are required beyond the additions described below.

---

## UX

**Dialog contents (single dialog):**
- Background colour picker: hex field seeded from `exportTheme` (`customVars.customPalette.diagramBg`), plus a "Transparent" toggle that sets `bgColor` to `'transparent'`
- "Download vector SVG" button — produces a true-flat SVG
- "Download universal SVG" button — produces a foreignObject SVG
- On error: MUI `Snackbar` with "Export failed" message; no silent failures

**No grid toggle.** **No preview.**

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `src/components/ExportSvgDialog/ExportSvgDialog.tsx` |
| **Create** | `src/components/ExportSvgDialog/index.ts` |
| **Modify** | `src/utils/exportOptions.ts` |
| **Modify** | `src/types/ui.ts` |
| **Modify** | `src/config/index.ts` (MainMenuOptionsEnum / MAIN_MENU_OPTIONS) |
| **Modify** | `src/components/MainMenu/MainMenu.tsx` |
| **Modify** | `src/components/UiOverlay/DialogLayer.tsx` |
| **Modify** | `docs/embedding.md` |
| **Modify** | `README.md` |

---

## Export Functions

### `exportAsVectorSvg(el: HTMLElement, bgColor: string): Promise<void>`

Produces a true-flat SVG by walking the renderer DOM:

1. `el.cloneNode(true)` — clone to avoid mutating the live DOM
2. Collect all `<svg>` elements (IsoTileArea rectangles, connector polylines) — lift as-is, they are already valid SVG
3. For each `<img>` (isometric icons): fetch `src`, convert to base64 data URI, replace with SVG `<image>` at same position/size
4. Strip all `<animateMotion>` elements — animated connectors become static polylines
5. Compute `viewBox` from `el.scrollWidth` / `el.scrollHeight`
6. Assemble root `<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">`, prepend `<rect width="100%" height="100%" fill={bgColor}/>`, append lifted children
7. Serialise with `XMLSerializer`, call `downloadFile(blob, generateGenericFilename('svg'))`

### `exportAsUniversalSvg(el: HTMLElement, bgColor: string): Promise<void>`

Produces a foreignObject SVG using `html-to-image`:

1. Temporarily set `el.style.background = bgColor`
2. Call `htmlToImage.toSvg(el)` — inlines external images as data URIs, wraps HTML in `<foreignObject>` automatically
3. Restore `el.style.background`
4. `downloadFile(blob, generateGenericFilename('svg'))`

---

## Menu Integration

- Add `SVG: 'EXPORT_SVG'` to `MainMenuOptionsEnum` (or equivalent enum location)
- Add entry `{ id: MainMenuOptionsEnum.SVG, label: 'Export as SVG', icon: ... }` to `MAIN_MENU_OPTIONS`
- In `MainMenu.tsx`: `EXPORT.SVG` calls `uiStateActions.setDialog('EXPORT_SVG')`
- Add `EXPORT_SVG = 'EXPORT_SVG'` to `DialogTypeEnum` in `src/types/ui.ts`
- In `DialogLayer.tsx`: render `<ExportSvgDialog>` when `dialog === DialogTypeEnum.EXPORT_SVG`

---

## Background Colour Handling

| Format | Mechanism |
|--------|-----------|
| Vector SVG | Prepend `<rect width="100%" height="100%" fill={bgColor}/>` as first child of root `<svg>` |
| Universal SVG | Set `el.style.background = bgColor` before `htmlToImage.toSvg()`, then restore |
| Transparent | `bgColor = 'transparent'`; vector SVG omits the background rect; universal SVG sets `background: transparent` |

---

## Error Handling

Both export functions are `async` and wrapped in `try/catch`. On failure, a MUI `Snackbar` displays "Export failed." with the caught error message. No silent failures.

---

## Documentation

- **`docs/embedding.md`**: Add `Export as SVG` row to the main menu options table; note the two formats and the background colour option.
- **`README.md`**: Add SVG export to the feature list.

---

## Out of Scope

- Grid export (explicitly excluded)
- Export preview
- Filename customisation (uses `generateGenericFilename` like PNG/PDF)
- Dark-theme SVG export (always `exportTheme`-seeded, not live theme)
- Programmatic SVG export via `useIsoflow()` (can be added in a follow-up)
