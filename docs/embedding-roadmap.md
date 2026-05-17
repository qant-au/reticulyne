# Embedding roadmap — FEA5 series

This document is a forward-looking specification for the next round of
embedding-facing features on `<Isoflow>`. It was written at the end of the
fourth-pass (`sunny-bentley`) review for a future session to execute against.

Each section below describes one feature: the motivation, the prop / API
addition, the integration points across the codebase, the test additions,
and the documentation updates. Each feature is independent — the three
can land in any order, in three separate commits.

For context on the work that's _already_ landed (and on which this roadmap
depends), see the `Recent work` section in [../README.md](../README.md) and
the commit history under the `SEC4`, `QUA4`, `BLD4`, `BUG4`, `DOC4`, and
`FEA4` task-ID prefixes.

---

## Context

During the fourth-pass review the user asked for four embedding-time
controls that go beyond what `<Isoflow>` currently exposes:

1. The ability to hide / restrict main-menu items when embedding the
   component into a host application — **partially covered already** by
   the existing `mainMenuOptions` prop. The unfinished piece is a Save
   callback that hands the model back to the host, plus a documentation
   refresh.
2. The ability to disable the bottom-centre title bar (the
   `<TitleBar>` component built under QUA4-10).
3. The ability to filter the bundled icon collections — allow-list or
   deny-list by collection name, case-insensitive.
4. The ability to hide the examples-picker dropdown ("Basic editor /
   Debug tools / Read-only mode"). **No library change is needed for
   this** — that dropdown only exists in `src/examples/index.tsx`, which
   is the dev-mode examples-picker entry (port 2223). The `<Isoflow>`
   component embedded as a library never renders it; the standalone
   Docker editor (port 2222) doesn't render it either. The user can
   already get a clean embedded experience by pointing their build at
   the main editor entry. This roadmap therefore covers only items
   1-3.

The three features below are sized for a single follow-up session
(~3-4 hours total): smallest blast radius first.

---

## FEA5-01 — `showTitleBar?: boolean` prop

**Motivation.** The title-bar is currently driven by an
editor-mode-based allowlist (`availableTools.includes('VIEW_TITLE')`).
That means consumers who want a clean canvas without "Project
title › View name" at the bottom have to either drop into
`'NON_INTERACTIVE'` mode (which also strips pan + zoom) or accept the
title. They need an independent override.

**Public API.** A new optional prop on `<Isoflow>`:

```ts
interface IsoflowProps {
  // ...existing fields...
  /**
   * Override the title-bar visibility. When undefined (default), the
   * title bar follows the editor-mode allowlist —
   * EDITABLE / EXPLORABLE_READONLY show it, NON_INTERACTIVE hides it.
   * When `true`, force-shown in every mode. When `false`, force-hidden
   * in every mode.
   */
  showTitleBar?: boolean;
}
```

**Touch points.**

- [src/types/isoflowProps.ts](isoflowProps.ts is not here — the actual path is `src/types/isoflowProps.ts`) — declare the prop.
- [src/Isoflow.tsx](../src/Isoflow.tsx) — thread the prop from `App` props through to the UiOverlay (probably via the existing ui-state store: add `showTitleBar` to the `UiState` shape, wire `uiStateActions.setShowTitleBar` analogous to `setEditorMode`, call it from the App `useEffect` that already sets editor mode).
- [src/components/UiOverlay/UiOverlay.tsx](../src/components/UiOverlay/UiOverlay.tsx) — adjust the existing `visible={availableTools.includes('VIEW_TITLE')}` prop on `<TitleBar>` to honour the override: `visible={showTitleBar ?? availableTools.includes('VIEW_TITLE')}`.

**Tests.** Extend [src/__tests__/Isoflow.smoke.test.tsx](../src/__tests__/Isoflow.smoke.test.tsx) with three new mounts: `showTitleBar={true}` in NON_INTERACTIVE (must show), `showTitleBar={false}` in EDITABLE (must hide), `showTitleBar={undefined}` in EXPLORABLE_READONLY (must show — fallback). Assert via `screen.queryByText` against the model's title.

**Docs.** [docs/api.md](api.md) — add `showTitleBar` row to the props table. [docs/embedding.md](embedding.md) — one paragraph noting the precedence: explicit prop overrides editor-mode default.

**Estimate.** ~45 minutes.

---

## FEA5-02 — `iconCollections?: { allow?, deny? }` filtering prop

**Motivation.** The Docker editor and every example loads five bundled
icon packs (AWS, Azure, GCP, Kubernetes, Isoflow) into
`initialData.icons`. A consumer who embeds Isoflow in a domain-specific
app (the user named their airport-management application) doesn't
want the AWS / GCP / Azure / Kubernetes icons — they want only their
custom collection. Today the consumer can pre-filter `initialData.icons`
before passing it in, but it's undocumented and clunky.

**Public API.** A new optional prop:

```ts
interface IsoflowProps {
  // ...existing fields...
  /**
   * Filter the bundled icon collections that survive into the editor.
   * Matches on `Icon.collection` case-insensitively. If `allow` is
   * supplied, only icons whose collection matches one of the entries
   * pass through. If `deny` is supplied, icons whose collection matches
   * are dropped. Both can be supplied together (allow first, then
   * deny). When omitted, no filtering — every icon in
   * `initialData.icons` passes through.
   */
  iconCollections?: {
    allow?: string[];
    deny?: string[];
  };
}
```

**Touch points.**

- [src/types/isoflowProps.ts](../src/types/isoflowProps.ts) — declare the prop.
- [src/Isoflow.tsx](../src/Isoflow.tsx) — accept and forward to `useInitialDataManager`.
- [src/hooks/useInitialDataManager.ts](../src/hooks/useInitialDataManager.ts) — extend the existing `UseInitialDataManagerOptions` interface (which already carries `onValidationError`). Apply the filter post-validation, before `model.actions.set(initialData)` — i.e. after the schema-shape gate but before the icons land in the store. New helper `filterIconsByCollection(icons, { allow?, deny? })` lives in [src/utils/common.ts](../src/utils/common.ts) next to `categoriseIcons`.

**Filter semantics** (worked example):
- Icons in `initialData.icons` with `.collection` ∈ `{"aws","gcp","custom-icons"}`.
- Consumer passes `iconCollections: { deny: ["AWS", "GCP"] }`.
- Result: only the `"custom-icons"` icons reach the store. (Case-insensitive — `"AWS"` matches `"aws"`.)

If both `allow` and `deny` are supplied, the allow-list filters first, then the deny-list removes anything still present. (`deny` is a refinement on top of `allow`.)

**Tests.** New file [src/utils/__tests__/iconCollections.test.ts](../src/utils/__tests__/iconCollections.test.ts) (or appended to `common.test.ts`) — pure-function tests for `filterIconsByCollection`. Five cases: allow-only, deny-only, both, case-insensitivity, no-prop = passthrough.

Plus one integration case in [src/hooks/__tests__/useInitialDataManager.test.tsx](../src/hooks/__tests__/useInitialDataManager.test.tsx) that mounts with `iconCollections={{ deny: ["AWS"] }}` against a fixture that includes AWS icons and asserts they're gone from `getModel().icons` after load.

**Docs.** [docs/api.md](api.md) — add the row + a small worked example. [docs/embedding.md](embedding.md) — note that this is _additive_ to the existing "pre-filter `initialData.icons` yourself" path; both work.

**Estimate.** ~1 hour.

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

**Docs.** [docs/api.md](api.md) — `onSave` prop row + `'ACTION.SAVE'` enum row. [docs/embedding.md](embedding.md) — a worked example showing the host pattern:

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

## Documentation-only follow-up (no FEA ID)

The existing `mainMenuOptions` prop covers most of the user's "Item 1"
ask from the fourth-pass review (show / hide menu entries from the
host). The mechanism is documented at [docs/api.md](api.md) and is
already type-safe. The follow-up here is a worked **embedding-pattern
example** in [docs/embedding.md](embedding.md) showing the common
"host-controlled save + selective export" pattern, something like:

```tsx
<Isoflow
  initialData={diagram}
  mainMenuOptions={[
    'ACTION.SAVE',      // requires FEA5-03
    'EXPORT.PDF',
    'EXPORT.PNG'
    // explicitly omitting EXPORT.JSON, ACTION.OPEN, ACTION.CLEAR_CANVAS,
    // LINK.GITHUB, VERSION — none of those make sense inside a hosted
    // editor whose state lives in the parent application.
  ]}
  onSave={(model) => {
    saveDiagramToBackend(model);
  }}
  showTitleBar={false}   // requires FEA5-01
  iconCollections={{     // requires FEA5-02
    deny: ['AWS', 'GCP', 'Azure', 'Kubernetes']
    // keeps only the consumer's custom icons and the Isoflow defaults
  }}
/>
```

This example is the natural documentation hook for all three FEA5
features. Once FEA5-01/02/03 are landed, add the example to
`docs/embedding.md` as a final "FEA5 lands" docs commit.

---

## Out of scope (deliberately deferred)

- **Examples-picker dropdown hide.** Only in the dev-container entry; not part of the embedded library. No prop needed.
- **Per-icon (not per-collection) filtering.** Filter the array yourself before passing it in — already possible via `initialData.icons`.
- **Custom Save UI** (renaming the menu entry, custom icons, etc.). The host wires what `onSave` does; Isoflow just fires the callback with a fixed label.
- **A reverse `'ACTION.SAVE_AS'` flow** that prompts the user for a name. The host can implement this trivially around the `onSave` callback.

---

## Verification plan (per feature)

After each FEA5 commit:

- `npm run lint` clean (`tsc --noEmit && eslint ./src`).
- `npx jest` — every existing test plus the new cases for the feature.
- `bash restart.sh` — manual smoke check via the dev container (port 2222 / 2223) confirming the new prop behaves as documented.
- `npm pack --dry-run` — pack-contents CI check still under allowed roots.

After all three FEA5 commits:

- A docs commit landing the worked embedding example in
  `docs/embedding.md`.
- README's "Recent work" section gains a one-line entry pointing at the
  FEA5 commits.
