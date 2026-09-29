# Documentation

Reference material for embedding and running `@qant-au/reticulyne`. The README at the project root
covers the quick highlights; everything below is the depth.

## Getting started

- [Installation](installation.md) — build from source and install the local package.
- [Quick start](quickstart.md) — minimal embed example, container sizing, Next.js note.

## Core reference

- [API reference](api.md) — every prop on `<Reticulyne>`, plus the `useReticulyne()` imperative hook.
- [Embedding contract](embedding.md) — deeper notes on editor modes, container sizing, callback identity, security model, host-managed save, and side effects on import.
- [Isopacks](isopacks.md) — what an isopack is, the bundled collections, and how to bring your own.

## Deployment

- [Standalone Docker](docker.md) — run the editor as an nginx-served SPA on its own port (built-in `restart.sh` helper).

## Project

- [Contributing](../CONTRIBUTING.md) — how to report bugs, request features and send pull requests; dev setup and tests.
- [Security policy](../SECURITY.md) — reporting and the residual-advisory ledger.
