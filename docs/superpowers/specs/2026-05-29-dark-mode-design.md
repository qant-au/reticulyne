# Dark Mode — Design Spec (FEA9-01)

**Date:** 2026-05-29
**Status:** Approved

---

## Problem

Dark mode infrastructure was built in FEA7-04 (theme factory, `useResolvedThemeMode`, `themeMode` prop, Grid, Quill overrides, examples toggle, tests). An audit pass identifies seven remaining gaps that prevent the feature from shipping:

1. `themeMode` defaults to `'light'`; ROADMAP specifies `'auto'`
2. `DEFAULT_COLOR` (new-node default) is a static light-mode constant
3. Connector direction glyphs are hardcoded `fill="black"` — invisible on dark canvas
4. Node label stem and card background are hardcoded dark/white — incorrect in dark mode
5. `ExportImageDialog` initialises the background colour from the legacy light-mode `customVars`
6. No `exportTheme` prop for embedders that need dark exports
7. No changelog or docs update for the breaking default change

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `themeMode` default | `'auto'` | Matches ROADMAP §1.1 spec |
| Connector glyph fill | `theme.palette.common.white` | Consistent with existing white stroke on same element |
| Label stem stroke | `theme.palette.text.primary` | Adaptive: near-black in light, near-white in dark |
| Label card background | `theme.palette.background.paper` | Replaces hardcoded `common.white` |
| Export default | Always light (`'#f6faff'`) | Exports must be readable regardless of editor theme |
| `exportTheme` prop | `'light' \| 'dark'`, default `'light'` | Embedders that operate dark-only need dark exports |
| `exportTheme` threading | Via `uiStateStore` | Same pattern as `editorMode`, avoids prop drilling |

---

## Public API Changes

### `IsoflowProps`

```typescript
// themeMode — default CHANGED from 'light' to 'auto' (BREAKING)
themeMode?: 'light' | 'dark' | 'auto';  // default: 'auto'

// exportTheme — NEW
exportTheme?: 'light' | 'dark';  // default: 'light'
```

**Breaking change:** Embedders relying on the implicit `'light'` default must now pass `themeMode="light"` explicitly.

### `UiState` / `UiStateActions`

Internal additions (not public API):
- `UiState.exportTheme: 'light' | 'dark'` (default `'light'`)
- `UiStateActions.setExportTheme(mode: 'light' | 'dark'): void`

---

## Component Changes

### `src/Isoflow.tsx`
- Default `themeMode` → `'auto'`
- Destructure `exportTheme = 'light'` from props
- Build `modeAwareInitialData`: when no `initialData` is provided, derive the default node colour from `theme.customVars.customPalette.defaultColor` (dark: `#5b6ab1`, light: `#a5b8f3`) instead of the static legacy `customVars`
- Sync `exportTheme` to `uiStateStore` via `useEffect` in `App`

### `src/components/SceneLayers/Connectors/Connector.tsx`
- Four `<GlyphRenderer fill="black" …>` → `fill={theme.palette.common.white}`

### `src/components/Label/Label.tsx`
- `stroke="black"` → `stroke={theme.palette.text.primary}`
- `bgcolor: 'common.white'` → `bgcolor: 'background.paper'`

### `src/components/ExportImageDialog/ExportImageDialog.tsx`
- Replace `import { customVars }` with `import { createIsoflowTheme }`
- `backgroundColor` initial state: `createIsoflowTheme(exportTheme ?? 'light').customVars.customPalette.diagramBg` (read `exportTheme` from `uiStateStore`)

---

## Testing

- `npm test` — update `Isoflow.fea7-04.test.tsx`: default mode assertion + `exportTheme="dark"` smoke test
- `npm run lint` — clean pass
- Manual QA: `bash restart.sh` → http://localhost:2223 → flip sidebar to **Dark**, verify connector arrows, label readability, default node colour, export dialog default background

---

## Coordination Notes

- ROADMAP §2.10 (Replace Quill with TipTap) will retire the Quill dark-mode CSS overrides in `GlobalStyles.tsx`. No action needed here; the overrides are harmless until that swap lands.
- The `exportTheme` prop is also relevant to §2.4 (SVG export) — that task should read `exportTheme` from the store using the same pattern.
