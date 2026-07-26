---
project: reticulyne
display_name: Reticulyne
type: other
prefix: iso
---

# Reticulyne TODO
- [x] Verify GitHub Dependabot alerts have cleared on the default branch after the v0.2.0 release — the Quill XSS advisory GHSA-v3m3-f69x-jf25 that motivated the TipTap migration, plus the DEP-06 dompurify / http-proxy-middleware moderates @due(2026-08-03) @id(iso-001)
  verified: quill #135 + DEP-06 moderates #140/#141 all now fixed; they were stale-open on a dependency graph frozen pre-v0.2.0, refreshed by the DEP-07 lockfile push. 0 runtime-scope alerts remain; 5 dev-only tracked as iso-002
- [ ] Bump the dev toolchain to clear the 5 residual dev-only Dependabot alerts — postcss >=8.5.18 (#153), js-yaml >=4.3.0 (#149, the existing ^4.2.0 override now pins the vulnerable release), shell-quote >=1.9.0 (#146), webpack-dev-server >=5.2.6 (#150, #151). All in-major patches. Zero runtime-scope alerts remain; the accepted brace-expansion GHSA-mh99-v99m-4gvg residual is documented in SECURITY.md DEP-07 @due(2026-08-24) @id(iso-002)

