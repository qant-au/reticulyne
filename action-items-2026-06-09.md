# Reticulyne Action Items — 2026-06-09

Derived from [code-review-2026-06-09.md](./code-review-2026-06-09.md). Items are listed in execution order: Critical first, then High, then Medium grouped by theme, then Low. Each item is independently actionable and references its finding by appendix number (e.g. `#4` → row 4 of the Appendix Finding Summary Table) and originating section.

Priority key: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical (do first)

*No Critical findings. The two highest-impact items — performance subscriptions in `useInteractionManager` / `useKeyboardShortcuts`, and the live API key on disk — sit at High and should be treated as the de-facto top of the queue.*

---

## 🟠 High (do before next release)

### ~~1. Rotate the live `MOONSHOT_API_KEY` and exclude `.env*` from Docker context~~ — `SEC-10` ✅ done — key rotated + removed from `.env.graphify`; `.dockerignore` covered earlier (`45c0b24`)
- **Why:** A plaintext `sk-...` key is sitting in `.env.graphify`. Gitignored — never committed — but reachable by any local-malware threat model, and not excluded from the Docker build context.
- **What:** Confirm the key is still active and rotate at the Moonshot console. Move secrets to a system keyring or `direnv`/`op` lookup rather than a plaintext dotfile. Add `.env*` to `.dockerignore` (covered separately by `BLD-02`).
- **Where:** `/Users/adam/Projects/reticulyne/.env.graphify`
- **Refs:** Review #2 (Section 2g)

### ~~2. Replace or fork `pathfinding@0.4.18` (unmaintained) — `SEC-04`~~ ✅ done (`0a3ecc0`)
- **Why:** Pre-1.0, no upstream release since ~2022. Any future advisory has no patch path. CommonJS-interop pain already required a dedicated `pathfindingMock.js` to make tests work.
- **What:** Either (a) vendor the small A* / BFS subset the editor uses (~200 LOC), (b) fork-and-pin under `@qant-au/pathfinding`, or (c) replace with `ngraph.path`. Bump `@types/pathfinding` to `0.1.0` in either case. Document the decision in `SECURITY.md` alongside other residuals.
- **Where:** `package.json:111`; `src/utils/pathfinder.ts:1`; `src/__tests__/mocks/pathfindingMock.js`
- **Refs:** Review #1 (Section 2c)

### ~~3. Narrow `useInteractionManager` store subscriptions — `PRF-01`~~ ✅ done (`e626de8`)
- **Why:** `useUiStateStore(s => s)` and `useModelStore(s => s)` subscribe to whole stores. Every pointermove updates `state.mouse`, invalidates the `onMouseEvent` `useCallback`, re-binds `window.addEventListener` for `pointermove`/`pointerdown`/`pointerup`/`contextmenu`/`wheel`. On a 120 Hz pointer, hundreds-to-thousands of listener add/remove cycles per second.
- **What:** Replace whole-store selectors with narrow ones — `useUiStateStore(s => s.mode)`, `s => s.actions`, `s => s.rendererEl`, etc. Stash live `uiState`/`model` in refs synced via a tiny effect; `onMouseEvent` reads from refs, so it doesn't depend on changing references.
- **Where:** `src/interaction/useInteractionManager.ts:46-51, 55, 73, 125`
- **Refs:** Review #3 (Section 3a)

### ~~4. Narrow `useKeyboardShortcuts` deps — stop re-binding `keydown` per pointermove — `PRF-02`~~ ✅ done (`5e2b6e0`)
- **Why:** `mousePosition` (used only as `tile:` payload for the `T` textbox tool) is in the effect's dep array; every pointermove changes it and causes `removeEventListener` + `addEventListener` for `keydown`. Same for `currentView`.
- **What:** Read `mousePosition`/`currentView` from a ref synced via a separate effect, OR call `useUiStateStore.getState()` at handler-fire time.
- **Where:** `src/interaction/useKeyboardShortcuts.ts:45-47, 372-393`
- **Refs:** Review #4 (Section 3a)

### ~~5. Split `useScene` into narrow hooks; add `React.memo` to SceneLayers leaves — `PRF-03` (and `PRF-04`)~~ ✅ done (`b9f8473`)
- **Why:** `useScene` subscribes to whole `model` and `scene` stores; consumers re-render on every mutation. The `useMemo` blocks merge `{ ...CONNECTOR_DEFAULTS, ...connector, ...sceneConnector }` per item per render — fresh object identity defeats any downstream `React.memo`. `Renderer.tsx` cascades this through every layer; no `React.memo` exists in `SceneLayers`.
- **What:** Split `useScene` into narrow hooks (`useSceneConnectorsList`, `useSceneItemsList`, …) each component subscribes to itself; memoize per-id via `Map<id, merged>`. Wrap `Connectors`, `Nodes`, `Rectangles`, `TextBoxes` parents in `React.memo`. Move `.reverse()`/`.sort()` into `useMemo`s.
- **Where:** `src/hooks/useScene.ts:27-29, 39-82`; `src/components/Renderer/Renderer.tsx:41`; `src/components/SceneLayers/Connectors/Connectors.tsx:35`; `Nodes.tsx:14`; `Rectangles.tsx:15`
- **Refs:** Review #5, #6 (Section 3a)

### ~~6. Switch MUI icon imports to per-icon subpath — `PRF-10`~~ ✅ done (`66801b4`)
- **Why:** All ten icon-importing files use `from '@mui/icons-material'` (barrel). The prod config externalises `^@mui\//`, so consumer bundlers do the tree-shake — but a consumer using CommonJS or a non-tree-shaking bundler ships the entire ~6 MB icon barrel.
- **What:** Switch each import to per-icon subpath (`from '@mui/icons-material/Search'`). The existing example at `src/examples/ExamplesSidebar.tsx:14-15` shows the pattern.
- **Where:** `src/components/ZoomControls/ZoomControls.tsx:5`; `MainMenu/MainMenu.tsx:19`; `ItemControls/NodeControls/NodeControls.tsx:6`; `ItemControls/IconSelectionControls/IconCollection.tsx:6`; `Label/ExpandButton.tsx:5`; `HelpButton/HelpButton.tsx:1`; `UiOverlay/TitleBar.tsx:8`; `ItemControls/components/DeleteButton.tsx:1`; `ItemControls/IconSelectionControls/Searchbox.tsx:2`; `ItemControls/TextBoxControls/TextBoxControls.tsx:9`
- **Refs:** Review #7 (Section 3b)

### ~~7. Lazy-load heavy dialogs and the Quill MarkdownEditor — `PRF-11`~~ ✅ done (`285f163`)
- **Why:** `dist/index.js` is 1.0 MB. Heavy MUI components (`ExportImageDialog`, `ExportSvgDialog`, `KeyboardShortcutsDialog`, `MarkdownEditor`/Quill) are all statically imported. A "diagram viewer" consumer who never opens export dialogs ships ~1 MB of code they'll never execute.
- **What:** Wrap each in `React.lazy()` and an appropriate `<Suspense>` boundary. Quill is the heaviest single chunk; ship as its own dynamic chunk.
- **Where:** `src/components/ExportImageDialog/`, `src/components/ExportSvgDialog/`, `src/components/KeyboardShortcutsDialog/`, `src/components/MarkdownEditor/`
- **Refs:** Review #8 (Section 3b)

### ~~8. Add `aria-label={name}` to `IconButton` — `QUA-10`~~ ✅ done (`966ab3e`)
- **Why:** Every `IconButton` in the toolbar (Select, Pan, Add-item, Rectangle, Connector, Text, menu, zoom) wraps a `<Button>` with icon SVG and no text. MUI's `<Tooltip title={name}>` wires `aria-describedby`, not `aria-label` — screen readers read the canvas editor's primary control surface as a row of unlabelled buttons. One change fixes the whole repo.
- **What:** In `IconButton.tsx`, add `aria-label={name}` to the underlying `<Button>`. Add `aria-pressed={isActive}` for toggle semantics.
- **Where:** `src/components/IconButton/IconButton.tsx:1-80`
- **Refs:** Review #24 (Section 9 — a11y)

### ~~9. Add `role="application"` and labelling to the canvas root — `QUA-11`~~ ✅ done (`32e96d8`)
- **Why:** Renderer root is a generic `<div>` — no role, no `aria-label`, no `aria-roledescription`. AT users have no way to know the editor surface exists.
- **What:** Wrap the renderer root in `role="application" aria-label="Diagram canvas" aria-roledescription="isometric diagram editor"`. Minimal fix — full canvas a11y is a separate roadmap-scale initiative.
- **Where:** `src/components/Renderer/Renderer.tsx:55-123`
- **Refs:** Review #25 (Section 9 — a11y)

### ~~10. Scope `useKeyboardShortcuts` listener off `window` — `FEA-07`~~ ✅ done (`99074ea`)
- **Why:** Shortcuts attach to `window.addEventListener('keydown', ...)`. An embedder mounting `<Reticulyne>` in a sidebar/modal preview gets their global keystrokes hijacked when the canvas doesn't have focus. Pressing `V`/`H`/`R`/`C`/`T`/`+`/`-`/`0`/`1`/`F`/`?` anywhere on the host changes Reticulyne's tool or zoom.
- **What:** Attach the listener to `uiState.rendererEl` (or a containing element with a `tabIndex`), OR gate every shortcut on `document.activeElement` being inside the renderer subtree. Add a symmetric `enableGlobalKeyboardShortcuts` prop mirroring FEA10-01's `enableGlobalDragHandlers`.
- **Where:** `src/interaction/useKeyboardShortcuts.ts:368-371`
- **Refs:** Review #26 (Section 9 — a11y)

### ~~11. Move `ModelStore` / `UiStateStore` / `SceneStore` Zustand-shaped types off the public surface — `QUA-03`~~ ✅ done (`4ce7fef`)
- **Why:** `ModelStore = Model & { actions: { get: StoreApi<ModelStore>['getState']; set: StoreApi<ModelStore>['setState'] } }` and siblings expose `zustand.StoreApi` directly in the published `.d.ts`. A careless embedder importing `ModelStore` can poke at `actions.set` and freeze the internal store shape as part of the public API. ROADMAP 1.6 explicitly calls this out.
- **What:** Move `ModelStore`, `SceneStore`, `UiStateStore`, `UiStateActions`, `UiState`, `Scene`, `SceneConnector`, `SceneTextBox`, `SceneConnectorOverlay`, `Mouse`, `Scroll`, all `Mode` variants, `ItemControls`, `ContextMenu`, `IconCollectionState`, `ClipboardEntry` to a new `src/types/internal.ts`. Stop re-exporting through `standaloneExports.ts` and the main entry.
- **Where:** `src/types/model.ts:56-61`; `src/types/scene.ts:78-83`; `src/types/ui.ts:194-231`; `src/standaloneExports.ts:8`
- **Refs:** Review #16 (Sections 4a, 5)

### ~~12. Add TSDoc to every `useReticulyne()`-returned method — `FEA-02`~~ ✅ done (`8b191ca`)
- **Why:** `ReticulyneProps` fields have rich JSDoc surfaced in IDE hover. The hook's returned methods (`getModel`, `loadModel`, `setEditorMode`, `setZoom`, `Connector.get`/`update`/`pulse`, etc.) have `//` comments but no `/** */` blocks. Behaviour gates ("no-op outside EDITABLE", "bypasses undo", "supersedes any in-flight pulse") live only in `docs/embedding.md`.
- **What:** Convert each member's leading comment into a TSDoc block so it lands in the emitted `.d.ts`. Bare minimum: `loadModel`, `setEditorMode`, `Connector.update`, `Connector.pulse`.
- **Where:** `src/Reticulyne.tsx:224-420`
- **Refs:** Review #12 (Section 5)

### ~~13. Mark `useReticulyne().Model` and `.uiState` as `@deprecated` — `FEA-03`~~ ✅ done (`8b191ca`)
- **Why:** IDE autocomplete shows them as siblings of `getModel`/`loadModel`, indistinguishable in rank. ROADMAP 1.6 plans to drop them in a breaking change; embedders adopting them today have no warning.
- **What:** `/** @deprecated Escape hatch — prefer the typed accessors above; will be removed before v1.0. */` on `Model` and `uiState` object-literal keys.
- **Where:** `src/Reticulyne.tsx:416-419`
- **Refs:** Review #13 (Section 5)

### ~~14. Bring `docs/api.md` prop table to parity with `embedding.md` — `DOC-01`~~ ✅ done (`6f8a48e`)
- **Why:** `api.md` claims to be "every prop … contract" but stops at `onSave`. Missing 9 props including the breaking-default-change `themeMode`. The `useReticulyne` table at L108-119 also omits `Connector.get`/`update`/`pulse`. An embedder reading only `api.md` misses `themeMode`'s breaking-change behaviour.
- **What:** Add rows for `enableAnimation`, `enableGlobalDragHandlers`, `themeMode`, `exportTheme`, `nodeIndicatorComponent`, `connectorIndicatorComponent`, `highlightedItemId`, `iconCollections`, `showTitleBar`, `children`. Add `Connector.get`, `Connector.update`, `Connector.pulse` to the hook table. OR restructure `api.md` as a thin index deferring to `embedding.md`.
- **Where:** `docs/api.md:24-37, 108-119`
- **Refs:** Review #14 (Sections 5, 6)

### ~~15. Decide and document the `useIsoflow` back-compat trade~~ — `FEA-04` ✅ done — clean cut (no alias), documented in CHANGELOG + embedding.md
- **Why:** CHANGELOG.md L22 says the rename was "same return shape and semantics", implying continuity. But no `useIsoflow` alias is exported — embedders upgrading get TypeScript errors with no soft deprecation. Documentation and code disagree about whether this is a clean cut or a smooth migration.
- **What:** Either (a) add `export const useIsoflow = useReticulyne;` decorated with `/** @deprecated Renamed to useReticulyne. */` for one minor cycle, OR (b) add explicit "no back-compat shims; rename in your imports" wording to CHANGELOG.md and docs/embedding.md.
- **Where:** `src/Reticulyne.tsx:422`; `CHANGELOG.md:22`; `docs/embedding.md`
- **Refs:** Review #15 (Section 5)

### ~~16. State a SemVer policy for 0.x~~ — `DOC-02` ✅ done — versioning-policy paragraph added to CHANGELOG.md
- **Why:** CHANGELOG.md cites SemVer adherence, but the 0.x contract is "anything may change in any minor". The "naming reset, not content reset" framing creates ambiguity about whether the API is stable (content didn't change) or unstable (version restarted).
- **What:** Add a short paragraph to README.md or CHANGELOG.md: "While on 0.x, minor releases may include breaking changes to props, hook return shape, or exported types. v1.0 will mark API stabilisation; until then, treat each minor as potentially breaking and read the release notes."
- **Where:** `README.md` or `CHANGELOG.md`
- **Refs:** Review #17 (Sections 5, 6)

### ~~17. Fix `docs/docker.md` CSP claim — strip `reticulyne.io` origins~~ — `DOC-04` ✅ done — img-src now matches `docker/nginx.conf`
- **Why:** docs/docker.md L85 documents `img-src 'self' data: blob: https://reticulyne.io https://static.reticulyne.io`. Actual nginx.conf (correctly, per CHANGELOG RNM-04) has `img-src 'self' data: blob:` — the `reticulyne.io` origins were removed during the rename. L89's accompanying prose is also wrong.
- **What:** Update `docs/docker.md:85` to remove the `reticulyne.io` origins; rewrite L89 to drop the claim. Match the actual `docker/nginx.conf` and `SECURITY.md`'s history note at L50.
- **Where:** `docs/docker.md:85, 89`
- **Refs:** Review #18 (Section 6)

### ~~18. Fix `docs/quickstart.md` — `window.alert` was removed~~ — `DOC-05` ✅ done — now describes the `onValidationError` contract
- **Why:** quickstart.md L52 says "Invalid data triggers an alert at mount and the editor renders empty." The `window.alert` was replaced by the `onValidationError` callback contract (docs/embedding.md L61 already says so). New embedders following quickstart see no alert and wonder why.
- **What:** Replace L52 with: "Invalid data is rejected by Zod; the editor renders empty and the failure is routed to `onValidationError` (or to `console.error` if you don't supply that prop)."
- **Where:** `docs/quickstart.md:52`
- **Refs:** Review #19 (Section 6)

### ~~19. Either export `ProcessedCollection` or rewrite `docs/isopacks.md` to describe the actual contract~~ — `DOC-06` ✅ done — docs rewritten to the exported `Icon[]`/`Icons` contract (no new export)
- **Why:** docs/isopacks.md and README.md cite `ProcessedCollection` as the icon-collections contract. The type is **not exported anywhere**. The actual exported types are `Icons` and `Icon`, with `collection?: string` discriminator.
- **What:** Either (a) actually export a `ProcessedCollection` type from `src/schemas` matching the documented shape plus a `mergeCollections()` helper, OR (b) rewrite `docs/isopacks.md` to describe the actual `Icon[]` contract with `{ id, name, icons }` grouping shown as a host-side convention. Update README L62 to match.
- **Where:** `docs/isopacks.md:25-30`; `README.md:62`
- **Refs:** Review #20 (Section 6)

### ~~20. Refresh in-range dependency bumps via `npm update`~~ — `DEP-02` ✅ done — lockfile refreshed; suite green (prod audit still clean)
- **Why:** Lockfile is behind manifest ranges for ~12 in-range bumps (`react 19.2.6 → 19.2.7`, `@mui/material 9.0.1 → 9.1.0`, `zustand 5.0.13 → 5.0.14`, `@typescript-eslint/* 8.59.3 → 8.61.0`, `webpack 5.106.2 → 5.107.2`, `webpack-merge 5.8.0 → 5.10.0`, `ts-jest 29.4.9 → 29.4.11`, `ts-loader 9.5.7 → 9.6.0`, `eslint-plugin-prettier`, `@types/react 19.2.14 → 19.2.17`). Drift, not pin policy.
- **What:** Run `npm update`. Run `npm test && npm run lint && npm run build`. Commit lockfile delta as `chore(DEP-NN): refresh in-range deps`.
- **Where:** `package.json` + `package-lock.json`
- **Refs:** Review #21 (Section 7)

### ~~21. Pin GitHub Actions to commit SHAs (especially in `release.yml`)~~ — `BLD-03` ✅ done — all `uses:` pinned to 40-char SHAs + `.github/dependabot.yml` added
- **Why:** All `uses:` lines pin to floating tags (`@v4`). A compromised maintainer or stolen PAT can repoint `v4` to a malicious commit. `release.yml` holds `packages: write` — highest-priority target.
- **What:** Pin each `uses:` to a 40-char SHA with a `# v4.1.1`-style comment. Enable `.github/dependabot.yml` with `github-actions` ecosystem and `pin-only` versioning so Renovate-style bumps continue.
- **Where:** `.github/workflows/ci.yml:18, 20, 82, 84, 92, 130`; `.github/workflows/release.yml:15, 17`
- **Refs:** Review #22 (Section 8)

### ~~22. Gate `release.yml` on lint, audit, and pack-contents~~ — `BLD-04` ✅ done — release job now mirrors CI (audit → lint → test → build → pack → publish)
- **Why:** `release.yml` runs only `npm ci → npm test → npm run build → npm publish`. No lint, no `npm audit --omit=dev --audit-level=moderate`, no pack-contents verification. A tag pushed from a branch that never saw `main` could publish a lint-failing or audit-failing build.
- **What:** Either (a) copy lint, audit, and pack-contents steps from `ci.yml` into `release.yml` before `npm publish`, OR (b) restructure `release.yml` to trigger on `workflow_run` of a successful CI run, gated on tag pattern.
- **Where:** `.github/workflows/release.yml:24-32`
- **Refs:** Review #23 (Section 8)

### ~~23. Fix the `console.log(err)` in ExportImageDialog~~ — `QUA-02` ✅ done — upgraded to `console.error('[reticulyne] image export failed:', err)`
- **Why:** Inconsistent with house style (`.error` + `[reticulyne]` prefix), and the UI already shows an error toast.
- **What:** Either delete (UI signal is sufficient) or upgrade to `console.error('[reticulyne] image export failed:', err)`.
- **Where:** `src/components/ExportImageDialog/ExportImageDialog.tsx:89`
- **Refs:** Review #9 (Section 4a)

### ~~24. Route `useImportFile` parse failures through `onValidationError`~~ — `BUG-01` ✅ already done (BUG5-05) — parse failures surface via the `[reticulyne]` console channel (`useImportFile.ts:38`)
- **Why:** When a user opens a malformed JSON file, the file picker closes and nothing happens in the UI. Schema-validation failures (post-parse) route through `onValidationError`, but parse failures bypass it. Inconsistent UX gap.
- **What:** Synthesise a `ZodIssue`-shaped object from the JSON parse error and route through `onValidationError`. Or extend the callback signature to carry parse errors. At minimum, surface a toast.
- **Where:** `src/components/MainMenu/useImportFile.ts:31, 38, 73`
- **Refs:** Review #10 (Sections 4a, 4f)

### ~~25. File a forward-looking FEA item for React 19 idiom adoption~~ — `FEA-01` ✅ done — ROADMAP §3.6 added
- **Why:** Codebase is React-19-*compatible* (passes strict hook rules) but not React-19-*idiomatic*. Zero hits for `useActionState`, `useFormStatus`, `<Suspense`, `React.use(`. Not a defect today but worth filing.
- **What:** Add an `FEA-NN` roadmap entry. Candidate fit: `loadModel` could return a Promise that consumers wrap in `<Suspense>`.
- **Where:** N/A (roadmap task)
- **Refs:** Review #11 (Section 4c)

---

## 🟡 Medium — Security hardening

### ~~26. Tighten icon URL schema + sanitize SVGs at export time~~ — `SEC-01` ✅ done — `iconSchema.url` scheme allowlist + hand-rolled SVG sanitizer in the export inliner (+ tests, docs)
- **Why:** `iconSchema.url` is `z.string().max(...)` — no protocol allowlist. URLs feed into `<img src=...>` (browser-blocked from JS exec) but **also** into `exportAsVectorSvg` → `fetchAsDataUri()` for inlining. Opening the exported SVG under `file:` scheme executes embedded `<script>` / `<foreignObject>` / event handlers.
- **What:** Restrict `iconSchema.url` to `https:`, `http:`, `data:image/{png,jpeg,gif,webp,svg+xml}`, `blob:`. Strip `<script>`, `<foreignObject>`, `on*` attributes when inlining SVG via `fetchAsDataUri`. Document the constraint in `docs/embedding.md` alongside existing DOMPurify guidance.
- **Where:** `src/schemas/icons.ts:13`; `src/schemas/common.ts:53`; `src/utils/exportOptions.ts:259`
- **Refs:** Review #27 (Section 2a)

### ~~27. Validate `useReticulyne().Model.set` payload~~ — `SEC-02` ✅ done — merge-then-validate against `initialDataSchema`, routed to `onValidationError`
- **Why:** `Model.set` only gates on `editorMode !== 'EDITABLE'`. It does not validate against `initialDataSchema`. A host wiring it to a remote payload (websocket, broker, iframe message) inherits the validation surface.
- **What:** Either (a) run payload through `initialDataSchema.safeParse` inside `gatedSet`, with `onValidationError` fallback; OR (b) add explicit prose in `docs/embedding.md` that `Model.set` is unvalidated and the host MUST validate before calling. Pairs with ROADMAP 1.6.
- **Where:** `src/Reticulyne.tsx:250-270`
- **Refs:** Review #28 (Section 2b)

### 28. Validate `Connector.update` patch — `SEC-03`
- **Why:** `Connector.update(id, patch)` accepts `Partial<Pick<...>>` and passes it directly to the reducer without per-field validation. A host driving from untrusted live-data could push out-of-enum `direction`, oversized `color`, contract violations.
- **What:** Validate `patch` against a partial of `connectorSchema` inside `Connector.update`. Mirror per-field bounds from `src/schemas/connector.ts`.
- **Where:** `src/Reticulyne.tsx:325-372`
- **Refs:** Review #29 (Section 2b)

### 29. Add `src/vendor/isopacks/VENDOR.md` provenance metadata — `SEC-06`
- **Why:** No `VERSION`, `README`, `PATCHES`, or `CHANGELOG`. A future maintainer has no basis to evaluate whether to bump or whether a hypothetical CVE applies.
- **What:** Add `VENDOR.md` recording: (a) upstream source URL + git SHA / npm version, (b) sync date, (c) any local modifications, (d) closure criterion.
- **Where:** `src/vendor/isopacks/`
- **Refs:** Review #30 (Section 2d)

### 30. Add `Strict-Transport-Security` header to nginx.conf — `SEC-07`
- **Why:** Image is intended for deployment behind a TLS-terminating reverse proxy. Without HSTS, a downgrade-attacker on the same network as a client can MITM the first request before TLS is forced.
- **What:** `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;` in both the server block and `location = /index.html`. Note in SECURITY.md that the header assumes HTTPS-only ingress.
- **Where:** `docker/nginx.conf`
- **Refs:** Review #31 (Section 2f)

### 31. Validate URL schemes in `fetchAsDataUri` — `SEC-11`
- **Why:** `exportAsVectorSvg` calls `fetch(imgEl.src)` for every node icon. Standalone Docker CSP blocks cross-origin, but embedders with permissive `connect-src` inherit a "browser-as-port-scanner" primitive when icon URLs come from untrusted `initialData`.
- **What:** In `fetchAsDataUri`, validate `src` against allowlist of safe schemes (`https:`, `data:`, `blob:`, same-origin `http:` and relative URLs) before fetching. Document in `docs/embedding.md`.
- **Where:** `src/utils/exportOptions.ts:142`
- **Refs:** Review #32 (Section 2h)

---

## 🟡 Medium — Performance

### 32. Memoize pathfinder obstacles + skip findPath when anchor tile unchanged — `PRF-05`
- **What:** Memoize obstacle tiles keyed on model+view reference. Skip `findPath` when the dragged anchor's *tile* coordinate is unchanged (per-pixel deltas already filtered, but verify). Throttle CONNECTOR-mode pointermove to rAF.
- **Where:** `src/interaction/modes/Connector.ts:18-51`; `src/stores/reducers/connector.ts:22-52`; `src/utils/pathfinder.ts`
- **Refs:** Review #33 (Section 3a). _Confidence: Low — needs profile to confirm scale of bottleneck._

### 33. Make `recordPriorState` a true no-op after first burst-call — `PRF-06`
- **What:** Skip `clearTimeout`+`setTimeout`+`set({...})` when `pendingPrior` is already populated. Currently fires history-store notifications per move.
- **Where:** `src/interaction/modes/DragItems.ts:89-114`; `src/hooks/useScene.ts:101-118`
- **Refs:** Review #34 (Section 3a)

### 34. Narrow `useScene.setState` history-store subscription — `PRF-07`
- **What:** Use two separate `useHistoryStore` selectors — `s => s.isApplying` and `s => s.actions` (latter is stable). Drops `setState` callback recreation per history-store mutation.
- **Where:** `src/hooks/useScene.ts:91-93, 101-118`
- **Refs:** Review #35 (Section 3a)

### 35. Hoist one transformed parent for all SceneLayers — `PRF-08`
- **What:** Replace per-layer GSAP tween with a single transform on a parent that all SceneLayers nest inside. Animate once per pan/zoom.
- **Where:** `src/components/SceneLayer/SceneLayer.tsx:29-40`
- **Refs:** Review #36 (Section 3a). _Confidence: Low — would benefit from a profile capture during pan._

### 36. Add `loading="lazy"` to node icon `<img>` tags — `PRF-13`
- **What:** Add `loading="lazy"` to both `IsometricIcon.tsx:23` and `NonIsometricIcon.tsx`. Free win for large diagrams.
- **Where:** `src/components/SceneLayers/Nodes/Node/IconTypes/IsometricIcon.tsx`; `NonIsometricIcon.tsx`
- **Refs:** Review #37 (Section 3c)

### 37. Replace `connectorOverlays` copy-spread with `Map` and `useSyncExternalStore` — `PRF-14`
- **What:** Drops O(n) rebuild per pulse for dense live-dashboard streams.
- **Where:** `src/Reticulyne.tsx:381-399`; `src/hooks/useScene.ts:278-303`
- **Refs:** Review #38 (Section 3d). _Confidence: Low — fine for sparse pulses._

---

## 🟡 Medium — Code health

### 38. Fix `ConnectorStyle` latent typing bug — `QUA-04`
- **What:** Change `ConnectorStyle = keyof typeof connectorStyleOptions` to `(typeof connectorStyleOptions)[number]['value']` (or whichever shape matches intended union). Currently produces `'0' | '1' | 'length' | …`.
- **Where:** `src/types/model.ts:38-46`
- **Refs:** Review #39 (Section 4a)

### 39. Rename `Isoflow` to `Reticulyne` in e2e comment — `QUA-05`
- **What:** One-line edit of stale rename artefact.
- **Where:** `e2e/examples-picker.spec.ts:148`
- **Refs:** Review #40 (Section 4b)

### 40. Audit the two `eslint-disable-next-line` escapes — `QUA-06`
- **What:** Document both as long-term acceptable (with rationale) or open a follow-up to restructure the ExportImageDialog effect as a `useMemo`-driven cache key.
- **Where:** `src/Reticulyne.tsx:201`; `src/components/ExportImageDialog/ExportImageDialog.tsx:133`
- **Refs:** Review #41 (Section 4c)

### 41. Add `useReticulyne` Connector-namespace test suite — `QUA-07`
- **What:** Tests for `Connector.get`/`update`/`pulse` covering gates (`NON_INTERACTIVE` no-op), pulse supersede semantics, and `update` validation post-SEC-03.
- **Where:** new `src/__tests__/Reticulyne.connector.test.tsx`
- **Refs:** Review #42 (Section 4d)

### 42. Add a Quill body XSS test — `QUA-08`
- **What:** Set `description = '<img src=x onerror=alert(1)>'` on a node, render, assert no `onerror` attribute survives. Locks in the implicit sanitization SECURITY.md depends on.
- **Where:** `src/components/MarkdownEditor/__tests__/`
- **Refs:** Review #43 (Section 4d)

### 43. Add a JSON export → import round-trip test — `QUA-09`
- **What:** Use `INITIAL_DATA` → export to JSON → import back → assert byte-equal (or schema-equal) model.
- **Where:** new test under `src/__tests__/`
- **Refs:** Review #44 (Section 4d)

---

## 🟡 Medium — API & embedding contract

### 44. Re-export enum const objects from standalone subpath — `FEA-05`
- **What:** Add `EditorModeEnum`, `MainMenuOptionsEnum`, `ProjectionOrientationEnum`, `DialogTypeEnum`, `LayerOrderingActionOptions`, `tileOriginOptions`, `ItemReferenceTypeOptions`, `AnchorPositionOptions` to `standaloneExports.ts`. Document which are runtime vs types-only.
- **Where:** `src/standaloneExports.ts`
- **Refs:** Review #45 (Section 5)

### 45. Rewrite the `useReticulyne()` worked example in `docs/embedding.md` — `DOC-03`
- **What:** Current example calls `setEditorMode → loadModel → setEditorMode` synchronously inside a `.then(...)`. Under React 19 batching, `loadModel` reads `editorModeRef` still pointing at the prior mode. Either restructure with `useEffect` chains across renders, or mount with `editorMode="EDITABLE"` from the start and transition. Verify with a real test before re-publishing.
- **Where:** `docs/embedding.md:340-371`
- **Refs:** Review #46 (Section 5)

### 46. Surface `setView(viewId)` on the documented API — `FEA-06`
- **What:** Either add `setView` to `useReticulyne()` return alongside `setEditorMode`/`setZoom`, OR document explicitly that view switching is escape-hatch only until v1.
- **Where:** `src/Reticulyne.tsx`; `docs/embedding.md:323-336`
- **Refs:** Review #47 (Section 5)

---

## 🟡 Medium — Documentation drift

### 47. Update SECURITY.md snapshot tag from `v4.5.0` to `v0.1.0` — `DOC-07`
- **What:** Re-run `npm audit --omit=dev` and refresh the "Current counts" snapshot.
- **Where:** `SECURITY.md:60`
- **Refs:** Review #48 (Section 6)

### 48. Fix `docs/api.md:71` renamer typo — `DOC-08`
- **What:** `markmanx/reticulyne` → `markmanx/isoflow`. The repo at `markmanx/reticulyne` does not exist.
- **Where:** `docs/api.md:71`
- **Refs:** Review #49 (Section 6)

### 49. Reconcile `Model.version` field across schema / quickstart / api.md — `DOC-09`
- **What:** Schema has `version: z.string().max(10).optional()`. api.md lists `version: string` required. Quickstart passes `version: ''`. Pick one: drop it from `Model` doc and quickstart, or document as required-with-default.
- **Where:** `src/schemas/model.ts:11-19`; `docs/quickstart.md:41-49`; `docs/api.md:89-98`
- **Refs:** Review #50 (Section 6)

### 50. Fix `docs/isopacks.md` bundled-pack name — `DOC-10`
- **What:** L62 says "**reticulyne** — general infrastructure icons". Actual pack-id is `isoflow` (preserved per CHANGELOG L48-51). Embedders typing `iconCollections: { allow: ['reticulyne'] }` would match nothing. Update to `**isoflow**` with a footnote explaining back-compat naming.
- **Where:** `docs/isopacks.md:62`
- **Refs:** Review #51 (Section 6)

### 51. Reconcile `TODO.md` with source comments that reference it — `DOC-11`
- **What:** TODO.md is empty; source comments cite "tracked in TODO.md" (e.g. `src/types/model.ts:45`). Either add the referenced follow-ups (with `iso-NN` IDs per the project's prefix registry), or remove the "tracked" claims.
- **Where:** `TODO.md`; `src/types/model.ts:45`
- **Refs:** Review #52 (Section 6)

---

## 🟡 Medium — Dependency hygiene

### 52. Bump `@types/jest` to `^30` to match runtime — `DEP-03`
- **What:** Runtime is `jest@^30.4.2`; types are `@types/jest@^29.5.14`. Bump to `^30`.
- **Where:** `package.json:71`
- **Refs:** Review #53 (Section 7)

### 53. Plan separate task IDs for cross-major upgrades — `DEP-04`
- **What:** `eslint 9 → 10`, `typescript 5 → 6`, `webpack-cli 5 → 7`, `webpack-merge 5 → 6`, `@testing-library/jest-dom 5 → 6` — one task ID and one PR each.
- **Where:** `package.json`
- **Refs:** Review #54 (Section 7)

### 54. Remove four likely-unused devDependencies — `DEP-05`
- **What:** Drop `@testing-library/jest-dom`, `jsdom` (direct), `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`. Verify `npm run lint && npm test && npm run build` still pass.
- **Where:** `package.json:64, 86, 74, 75`
- **Refs:** Review #55 (Section 7)

### 55. Verify and document transitive Quill version under `react-quill-new` — `DEP-06`
- **What:** Run `npm ls quill`. Document the result in `SECURITY.md`. ROADMAP 2.10 tracks the eventual swap to TipTap.
- **Where:** `package.json:112`; `SECURITY.md`
- **Refs:** Review #56 (Section 7)

---

## 🟡 Medium — Build & deployment

### 56. Add tag-matches-version assertion in `release.yml` — `BLD-05`
- **What:** Pre-publish step that fails if `'v' + package.json.version !== process.env.GITHUB_REF_NAME`.
- **Where:** `.github/workflows/release.yml`
- **Refs:** Review #57 (Section 8)

### 57. Add CHANGELOG-mentions-version gate to `release.yml` — `BLD-06`
- **What:** Grep `CHANGELOG.md` for the current version header before publish.
- **Where:** `.github/workflows/release.yml`
- **Refs:** Review #58 (Section 8)

### 58. Decide Docker-image publish path: GHCR or documented-local-only — `BLD-07`
- **What:** Either add a `docker-publish.yml` workflow on tag pushing `ghcr.io/qant-au/reticulyne` and `ghcr.io/qant-au/reticulyne-examples`, OR explicitly document in `docs/docker.md` that local build is the only supported path.
- **Where:** `.github/workflows/`; `docs/docker.md`
- **Refs:** Review #59 (Section 8)

### 59. Document GitHub Packages rollback procedure — `DOC-14`
- **What:** Add a "Rollback" subsection to `docs/contributing.md`: ship a fixed `0.1.N+1` patch, do not attempt deletion of published versions, link to the deprecate-limitation note from recent commit `be36b38`.
- **Where:** `docs/contributing.md`
- **Refs:** Review #60 (Section 8)

### 60. Make e2e mandatory on release tags or auto-trigger via paths filter — `BLD-08`
- **What:** Either add an e2e job to `release.yml` (mirroring `ci.yml:73-136`), or auto-enable `[run e2e]` when the diff touches `src/components/**` or `e2e/**` via paths filter.
- **Where:** `.github/workflows/ci.yml:73-79`; `.github/workflows/release.yml`
- **Refs:** Review #61 (Section 8)

---

## 🟡 Medium — Other

### 61. No focus management baseline (informational)
- **What:** Once QUA-10 (`aria-label`) lands, the toolbar becomes Tab-reachable. No further focus-management work urgent.
- **Where:** Repo-wide
- **Refs:** Review #62 (Section 9 — a11y)

### 62. Update ROADMAP 2.12 implementation note (touch pinch via Pointer Events) — `DOC-16`
- **What:** ROADMAP describes wiring legacy TouchEvents; post-FEA10-01 the path is via tracking two `pointerId`s. Update wording.
- **Where:** `ROADMAP.md` section 2.12
- **Refs:** Review #63 (Section 9 — touch)

### 63. Touchscreen users have no zoom path (already tracked as ROADMAP 2.12)
- **What:** No fix in this review cycle; flagged for awareness.
- **Where:** `src/interaction/useInteractionManager.ts`
- **Refs:** Review #64 (Section 9 — touch). See also ROADMAP 2.12.

### 64. Add `dependency-review-action` workflow on PRs — `BLD-09`
- **What:** Add a workflow using `actions/dependency-review-action` to flag new advisories in PRs before merge. Optional: CodeQL on a weekly schedule.
- **Where:** new `.github/workflows/dependency-review.yml`
- **Refs:** Review #65 (Section 9 — ci)

### 65. Add a pre-commit lint hook — `QUA-12`
- **What:** Wire `husky` or `lefthook` to run `npm run lint` before commit. Catches prettier-error-level misses before CI.
- **Where:** new `.husky/pre-commit`
- **Refs:** Review #66 (Section 9 — lint)

### 66. Split `src/hooks/useScene.ts` into per-domain hooks — `QUA-13`
- **What:** 641 lines is the largest non-test file. Split candidates: `useSceneItems`, `useSceneConnectors`, `useSceneRectangles`, `useSceneTextBoxes`, `useSceneClipboard`, `useSceneHistory`. The reducer split is the right boundary; the hook routes to them.
- **Where:** `src/hooks/useScene.ts`
- **Refs:** Review #67 (Section 9 — tech debt)

---

## 🟢 Low (do when convenient)

### 67. `quill@2.0.3` XSS — known and accepted (no action)
- **Where:** transitive via `react-quill-new`
- **Refs:** Review #68 (Section 2c). Already in `SECURITY.md` residual ledger.

### 68. Source maps shipped in published tarball — `SEC-05`
- **What:** Intentional; if you want belt-and-braces, tighten the CI pack-contents check to assert specific allowed file extensions inside `dist/`.
- **Where:** `dist/*.js.map`; `.github/workflows/ci.yml:35-49`
- **Refs:** Review #69 (Section 2c)

### 69. `dompurify@3.4.3` transitive via jspdf behind 3.4 line (no immediate action)
- **What:** Monitor for jspdf bump.
- **Refs:** Review #70 (Section 2c)

### 70. Replace `file-saver` with inline DOM-API saveAs — `DEP-01`
- **What:** ~20-LOC helper drops both `file-saver` and `@types/file-saver`. Removes a supply-chain edge.
- **Where:** `src/utils/exportOptions.ts:2, 37`; `src/components/MainMenu/useExportJson.ts:3`
- **Refs:** Review #71 (Section 2c)

### 71. Add `prepublishOnly` script — `BLD-01`
- **What:** `"prepublishOnly": "npm run lint && npm test && npm run build"` in package.json. Catches local-publish footguns.
- **Where:** `package.json:44-56`
- **Refs:** Review #72 (Section 2e)

### 72. Tighten `.dockerignore` — `BLD-02`
- **What:** Add `.env*`, `testing/`, `code-review-instructions.md`, `ROADMAP.md`, `TODO.md`, `CLAUDE.md`, `SECURITY.md`, `CHANGELOG.md`, `.idea/`.
- **Where:** `.dockerignore`
- **Refs:** Review #73 (Section 2f)

### 73. Tighten `Referrer-Policy` to `strict-origin-when-cross-origin` — `SEC-08`
- **What:** Same compatibility with Google Fonts; leaks less.
- **Where:** `docker/nginx.conf:43`
- **Refs:** Review #74 (Section 2f)

### 74. Add COOP / CORP headers — `SEC-09`
- **What:** `Cross-Origin-Opener-Policy "same-origin"` and `Cross-Origin-Resource-Policy "same-origin"` for static assets. Defer COEP.
- **Where:** `docker/nginx.conf`
- **Refs:** Review #75 (Section 2f)

### 75. Memoize Cursor chroma alpha computation — `PRF-09`
- **What:** `chroma(theme.palette.primary.main).alpha(0.5).css()` is stable; memoize per theme.
- **Where:** `src/components/Cursor/Cursor.tsx:8-13`
- **Refs:** Review #76 (Section 3a)

### 76. Use `asset/resource` for SVGs > 4 KB — `PRF-12`
- **What:** Current `asset/inline` rule is fine today (only one tiny SVG) but will bloat the JS if larger SVG assets are added.
- **Where:** `webpack/base.config.js:37-41`
- **Refs:** Review #77 (Section 3b)

### 77. Remove `src/assets/grid-tile-bg.svg` if no longer imported — `QUA-01`
- **What:** `Grid` generates the SVG inline at runtime. grep for `grid-tile-bg`; if no imports remain, delete.
- **Where:** `src/assets/grid-tile-bg.svg`
- **Refs:** Review #78 (Section 3c). _Confidence: Low — verify imports first._

### 78. Dev port hardcoding (no action)
- **Refs:** Review #79 (Section 4e). Leave as-is unless second consumer of the port emerges.

### 79. Fix grammar nit in `docs/embedding.md:540` — `DOC-13`
- **What:** "an Reticulyne dependency" → "a Reticulyne dependency".
- **Where:** `docs/embedding.md:540`
- **Refs:** Review #80 (Section 6)

### 80. Inline ROADMAP's "ten corrections" reference — `DOC-12`
- **What:** "See full enumeration in prior ROADMAP versions" is unhelpful for readers without `git log` at hand. Inline or remove.
- **Where:** `ROADMAP.md:51-52`
- **Refs:** Review #81 (Section 6)

### 81. Document minimum browser versions in README — `DOC-15`
- **What:** One-line translation of the browserslist target (e.g. "Chrome 90+, Firefox 90+, Safari 14+, Edge 90+").
- **Where:** `README.md` Requirements section
- **Refs:** Review #83 (Section 9 — browser)

### 82. i18n inventory (no action — deferred per ROADMAP)
- **Refs:** Review #82 (Section 9 — i18n)

### 83. No `upstream` git remote (no action — upstream unmaintained)
- **Refs:** Review #84 (Section 9 — fork)

---

*End of action items. See [code-review-2026-06-09.md](./code-review-2026-06-09.md) for full context, severity definitions, and the executive summary.*
