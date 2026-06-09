# Documentation

Reference material for embedding and running `@qant-au/isoflow`. The README at the project root
covers the quick highlights; everything below is the depth.

## Getting started

- [Installation](installation.md) — install from GitHub Packages, including `.npmrc` setup and token requirements.
- [Quick start](quickstart.md) — minimal embed example, container sizing, Next.js note.

## Core reference

- [API reference](api.md) — every prop on `<Reticulyne>`, plus the `useReticulyne()` imperative hook.
- [Embedding contract](embedding.md) — deeper notes on editor modes, container sizing, callback identity, security model, host-managed save, and side effects on import.
- [Isopacks](isopacks.md) — what an isopack is, the bundled collections, and how to bring your own.

## Deployment

- [Standalone Docker](docker.md) — run the editor as an nginx-served SPA on its own port (built-in `restart.sh` helper).

## Project

- [Contributing](contributing.md) — current development stance, dev workflow once contributions reopen.
- [Security policy](../SECURITY.md) — reporting and the residual-advisory ledger.
