# TypeScript + Effect monorepo, SvelteKit SPA client, SQLite on every side

The system is a TypeScript monorepo built on Effect: a `domain` package (Schemas for Episodes, Entries, Views and sync operations, plus pure merge rules), a `server` package (Effect platform HTTP/RPC, feed poller, `@effect/sql` over SQLite), and a `web` package (SvelteKit in SPA mode — `adapter-static`, `ssr = false` — shipped both as an Android-first PWA and as a macOS-only Electron desktop app, both in v1; Electron adds media keys / Now Playing integration and auto-update, and runs the same browser-SQLite storage rather than a native database so there is one code path). The client keeps its own SQLite database in the browser (WASM on OPFS, via `@effect/sql-sqlite-wasm`) so Views are plain SQL with full-text search and both sides share one schema; SQLite also exists natively on every platform, so a future native client keeps the same data model.

## Considered Options

- **SvelteKit server routes as the backend** — rejected; the feed poller is a long-running job, not request-scoped work.
- **IndexedDB on the client** — viable fallback, but Views would be hand-written JS filters and joins with no shared schema.
- **LiveStore as a ready-made sync engine** — close match to ADR 0003, but pre-1.0 and would own both our sync and how Episodes reach clients.
- **React instead of Svelte** — larger ecosystem for touch drag-reorder and virtualised lists; Svelte chosen by preference, with `svelte-dnd-action` and `@tanstack/svelte-virtual` covering those needs.
