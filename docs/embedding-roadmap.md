# Embedding roadmap — FEA5 series

This document is a forward-looking specification for the remaining
embedding-facing feature on `<Isoflow>`, for a future session to execute against.

It describes the feature: the motivation, the prop / API addition, the
integration points across the codebase, the test additions, and the
documentation updates.

For context on the work that's _already_ landed (and on which this roadmap
depends), see the `Recent work` section in [../README.md](../README.md) and
the commit history under the `SEC4`, `QUA4`, `BLD4`, `BUG4`, `DOC4`,
`FEA4`, and `FEA5` task-ID prefixes.

---

## Context

During v4.x development four embedding-time controls were identified
that go beyond what `<Isoflow>` originally exposed:

1. **Hide / restrict main-menu items** — covered by the existing
   `mainMenuOptions` prop. The remaining piece is a Save callback that
   hands the model back to the host (this is FEA5-03 below).
2. **Disable the bottom-centre title bar** — **landed** as FEA5-01
   (`showTitleBar` prop).
3. **Filter bundled icon collections** — **landed** as FEA5-02
   (`iconCollections` prop).
4. **Hide the examples-picker dropdown** — no library change needed;
   that dropdown only exists in `src/examples/index.tsx` (the
   dev-mode entry on port 2223). The embedded `<Isoflow>` library
   never renders it, and the standalone Docker editor (port 2222)
   doesn't either.

Only FEA5-03 remains.

---

## FEA5-03 — `onSave?` callback + new `'ACTION.SAVE'` menu identifier

**Motivation.** When a consumer embeds Isoflow into a host application,
the natural save path is "hand the model back to the host" — not
"download a JSON file". The user wants a menu entry that calls back
with the current model. The host then persists it however it wants.

**Public API.** A new optional callback prop + a new menu identifier:

```ts
interface IsoflowProps {
  // ...existing fields...
  /**
   * Invoked when the user clicks the "Save" menu entry. Receives the
   * current model snapshot. The host application is responsible for
   * persisting it. When omitted, the 'ACTION.SAVE' menu entry is
   * suppressed even if it's listed in `mainMenuOptions` — and a
   * `console.warn` flags the misconfiguration in dev builds.
   */
  onSave?: (model: Model) => void;
}
```

Plus `'ACTION.SAVE': 'ACTION.SAVE'` added to `MainMenuOptionsEnum` in
[src/types/common.ts](../src/types/common.ts). Off-by-default (host
must opt in by listing `'ACTION.SAVE'` in `mainMenuOptions` AND
supplying `onSave`).

**Touch points.**

- [src/types/common.ts](../src/types/common.ts) — extend the enum.
- [src/types/isoflowProps.ts](../src/types/isoflowProps.ts) — declare `onSave`.
- [src/Isoflow.tsx](../src/Isoflow.tsx) — stash `onSave` in a ref using the existing `onModelUpdatedRef` pattern (callback identity must stay stable across re-renders). Expose via context or via the ui-state store actions.
- [src/components/MainMenu/MainMenu.tsx](../src/components/MainMenu/MainMenu.tsx) — new MenuItem rendered when `mainMenuOptions.includes('ACTION.SAVE')`. Use the `SaveOutlined` icon from `@mui/icons-material`.
- `src/components/MainMenu/useSaveModel.ts` (new) — hook following the QUA4-09 / FEA4-04 pattern. Reads the latest model snapshot from the store, calls `onSave(model)`, closes the menu. If `onSave` is undefined but the menu item was rendered (i.e. host passed `'ACTION.SAVE'` in `mainMenuOptions` without `onSave`), `console.warn` once with a clear "wire onSave" diagnostic.

**Suppression rule.** The menu entry should not render if `onSave` is missing. Don't show a button that does nothing. The console warning fires on first render if the misconfiguration is detected.

**Tests.** Extend [src/__tests__/Isoflow.readonly.test.tsx](../src/__tests__/Isoflow.readonly.test.tsx) (or add a new dedicated `Isoflow.save.test.tsx`) with: `onSave` supplied + `'ACTION.SAVE'` in mainMenuOptions → click "Save" → callback fires with the current model. `onSave` missing → menu entry not rendered. `'ACTION.SAVE'` not in `mainMenuOptions` → menu entry not rendered regardless.

**Docs.** [docs/api.md](api.md) — `onSave` prop row + `'ACTION.SAVE'` enum row. [docs/embedding.md](embedding.md) — extend the existing "Controlling UI visibility" section with an `onSave` worked example showing the host pattern:

```tsx
<Isoflow
  initialData={fromBackend}
  mainMenuOptions={['ACTION.SAVE', 'EXPORT.PDF']}
  onSave={(model) => {
    return postToBackend(model);
  }}
/>
```

**Estimate.** ~1.5 hours including tests and docs.

---

## Out of scope (deliberately deferred)

- **Examples-picker dropdown hide.** Only in the dev-container entry; not part of the embedded library. No prop needed.
- **Per-icon (not per-collection) filtering.** Filter the array yourself before passing it in — already possible via `initialData.icons`.
- **Custom Save UI** (renaming the menu entry, custom icons, etc.). The host wires what `onSave` does; Isoflow just fires the callback with a fixed label.
- **A reverse `'ACTION.SAVE_AS'` flow** that prompts the user for a name. The host can implement this trivially around the `onSave` callback.

---

## Verification plan

After the FEA5-03 commit:

- `npm run lint` clean (`tsc --noEmit && eslint ./src`).
- `npx jest` — every existing test plus the new cases for the feature.
- `bash restart.sh` — manual smoke check via the dev container (port 2222 / 2223) confirming the new prop behaves as documented.
- `npm pack --dry-run` — pack-contents CI check still under allowed roots.
- The README's "Recent work" section gains a one-line entry pointing at the FEA5-03 commit, completing the FEA5 series alongside the existing FEA5-01 / FEA5-02 entries.