# TypeScript + Effect monorepo, SvelteKit SPA client, SQLite on every side

The system is a TypeScript monorepo built on Effect: a `domain` package (Schemas for Episodes, Entries, Views and sync operations, plus pure merge rules), a `server` package (Effect platform HTTP/RPC, feed poller, `@effect/sql` over SQLite), and a `web` package (SvelteKit in SPA mode — `adapter-static`, `ssr = false` — shipped both as an Android-first PWA and as a macOS-only Electron desktop app, both in v1; Electron adds media keys / Now Playing integration, and runs the same browser-SQLite storage rather than a native database so there is one code path). The client keeps its own SQLite database in the browser (WASM on OPFS, via `@effect/sql-sqlite-wasm`) so Views are plain SQL with full-text search and both sides share one schema; SQLite also exists natively on every platform, so a future native client keeps the same data model.

**Versions and tooling:** Effect 4 (stable since `effect@4.0.0`, October 2026, with a three-year support window), exact versions pinned; Node LTS for the server; pnpm workspaces; GitHub for the repository, CI (Actions) and release artifacts. Rust for the server was considered and rejected: the merge rules must run identically on clients and server, and a second language means either duplicating them or shipping them to the client as WASM.

**Desktop updates:** there is no Apple Developer account, so builds cannot be notarized and Electron's macOS auto-updater (which requires a signed app) is unavailable. v1 instead ships a single local command that pulls, builds and installs the app into `/Applications`; a locally built app carries no quarantine flag, so Gatekeeper does not interfere. An "update available" notice backed by unsigned GitHub Releases may come later; real auto-update returns only if an account is bought.

## Considered Options

- **SvelteKit server routes as the backend** — rejected; the feed poller is a long-running job, not request-scoped work.
- **IndexedDB on the client** — viable fallback, but Views would be hand-written JS filters and joins with no shared schema.
- **LiveStore as a ready-made sync engine** — close match to ADR 0003, but pre-1.0 and would own both our sync and how Episodes reach clients.
- **React instead of Svelte** — larger ecosystem for touch drag-reorder and virtualised lists; Svelte chosen by preference, with `svelte-dnd-action` and `@tanstack/svelte-virtual` covering those needs.
