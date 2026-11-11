# Online-only web client

Phase 4 of [the platform plan](../plans/platform-clients.md), under `pod-apx.2`.
[ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md) sets the split.
Milestones 1–3 are implemented. Web uses server reads and in-memory pending edits.
Electron keeps local SQLite. This change has not been deployed.

## Seam

`src/data/DataLayer.ts` is the Effect service for screens and playback.
`app/data.ts` keeps the React atoms and their refresh triggers.
The service returns domain values, Maps and Sets. It exposes no SQL.

- Reads: Entry summaries, Subscription list and detail, saved Views, filters and
  counts, Episode detail and Listening metadata.
- Playback: title, host audio URL, Artwork, duration, Subscription id, Played
  threshold, Playback Settings and stored Chapters. Chapter resolution is separate.
- State: observable State and status, Device id, `record(change)`, `sync` and
  `runInBackground`. Status includes pending edits, last sync, errors and readiness.
- Library updates invalidate `catalogueKey`. State changes refresh dependent atoms.

`LocalDataLayer.ts` holds the local queries. It delegates writes, State and lifecycle
to `SyncEngine`. The engine keeps the durable outbox, confirmed State, cursors and
sync scheduler. `LocalClient.ts` composes SQLite, sync, downloads and Download Rules.

## Server reads

The contract is in `packages/api/src/Reads.ts`. Handlers are in
`packages/server/src/Http.ts` and queries are in `packages/server/src/Reads.ts`.
The generated contract is `packages/domain/protocol/openapi.json`.

- `GET /api/reads/views/:id`: saved View results.
- `POST /api/reads/filter`: unsaved `{ filter, sort, limit }` results.
- `POST /api/reads/search`: Library text Search, newest first.
- `GET /api/reads/views/counts`: all saved View counts in one summary.
- `POST /api/reads/episodes`: summaries for up to 200 ids. Missing ids are omitted.
  These include titles for Entry rows and title lookup.
- `GET /api/reads/episodes/:id`: detail and playback metadata, including stored
  Chapters and Artwork fallback. The existing Chapters endpoint resolves Chapters.
- `GET /api/reads/subscriptions`: paged active Subscriptions with Episode and
  Unplayed counts, speed and override counts.
- `GET /api/reads/subscriptions/:id`: detail, including removed Subscriptions.
- `GET /api/reads/stats/podcasts` and `/api/reads/stats/episodes`: paged podcast
  names and stored Episode ids. Include former Subscriptions and all stored Episodes.
  Combine these with State using `Listening.stats` on the viewing Device. The server
  does not choose the viewing calendar.

Views, filters and Search run `ViewQuery.compile` against the shared SQLite schema.
There is no second filter evaluator. Library visibility, Mentions, Published ordering,
LastDays and View limits keep their local rules. Counts include the View's limit.
Every shared View vector is compared with local SQLite and the HTTP results.

Decided (owner, 11 Nov 2026): long lists use bounded pages and stable continuations.
Pages default to 100 items and allow 1–200. A response includes `total`, `cursors`
and a nullable `continuation`. Send that opaque token with the same query and page
size. Tokens freeze LastDays time and preserve the View's limit across all pages.
Each page reads its count, rows and cursors in one transaction. Tokens are signed
and bound to the query and both database cursors. If data changes, `409 ReadChanged`
requires a fresh first page. Invalid tokens, changed queries or a server restart
return `400 InvalidContinuation`. No result snapshot is kept in server memory.

Reuse `GET /api/sync/pull?since=0` for current State and its operation cursor.
State and cursor now read in one transaction. Incremental pulls keep existing rules.
Keep existing Library, Directory, OPML and media APIs.

## Open tabs and writes

Decided (owner, 11 Nov 2026): live updates use WebSockets with cursor catch-up and
polling fallback. `GET /api/live?state=<last>&library=<last>` upgrades the socket.
It sends `{ state, library, reset }` immediately, then when either cursor changes.
The first message coalesces changes missed during a disconnect. Notifications
invalidate reads; they do not carry another Library or State copy. Refresh State
and affected reads on every connection and return to the tab. If `reset` is true,
pull State from zero. Each tab can connect independently.

The server checks durable cursors every 500 ms while a socket is open. This covers
feed refreshes, Subscription overrides and native edits. It sends a heartbeat every
15 seconds and stops the loop when the peer closes. If a socket cannot connect,
poll `GET /api/live/cursors`, compare both cursors and refresh changed reads. The
client adapter will own reconnection, polling and tab-return handling in milestone 3.

Authentication follows [ADR 0004](../adr/0004-tailnet-is-the-auth-boundary.md): the tailnet is the
boundary. There is no new login or token. Use a same-origin socket. Upgrades require
an Origin equal to the request origin, including scheme and port. The HTTPS proxy
must preserve Host and set `X-Forwarded-Proto`. Cross-origin and missing Origins
receive 403 before upgrade.

Decided (owner, 11 Nov 2026): one Device per browser profile, kind `web`.
The generated schema and registration vectors include `web`. Swift and Kotlin
accept it alongside `pwa`, `desktop` and `android`. Protocol version stays 4; no
Operation or reducer changes were made. The web adapter stores the opaque profile
id and next sequence in IndexedDB. Read/write transactions serialize allocations
across tabs. Sequence reservations commit before an Operation is sent. A crash may
leave a gap. It cannot reuse a sequence. Electron keeps its own Device.

Decided (owner, 11 Nov 2026): failed edits stay in the tab with visible retry.
Use stable operation ids with `/api/sync/push`. Its `acknowledged` array reports all
submitted ids committed by the server, including retries. `accepted` still counts
only new intentions. A missing response leaves delivery unknown; retry the same ids.
The whole push is transactional. Older servers may omit `acknowledged`.

The web adapter keeps optimistic edits in memory while the tab is open. `record`
accepts the edit; status tracks delivery. Failed edits show Pending and Retry. New
user edits are disabled while known offline. There is no durable outbox. A
`beforeunload` warning protects departures with unsent edits. Leaving still drops
them. The web typed-edit journal records directly into this memory. It does not
replay the old browser journal. Electron still persists before returning.

Playback keeps the shared Position, Played and Listening rules. A web report is
accepted into tab memory before its measured amounts are cleared. Reports can keep
the playing tail pending while disconnected. They use the same stable-id retry.
Closing the tab can lose this tail. Page lifecycle upload remains best effort.

The `pod-apx.3` behavior is integrated here. `BroadcastChannel` makes Play in one
tab pause its peers in the same browser. Pausing uses normal Position and Listening
flushes. Other Devices stay independent. The web tab lock is removed.

## Build split

Vite selects `WebClient` for web and `DesktopClient` for `--mode desktop`. The web
bundle excludes the SQLite worker, OPFS downloads, Download Rules and `TabGate`.
Download controls and offline promises are hidden. Icons and navigation stay.
There is no install manifest, precache or service worker registration. A retirement
script at the old `/sw.js` path unregisters old workers, clears app caches and
reloads their pages. The new entry point also clears old workers and app caches.

Electron keeps the React screens, `LocalClient`, SQLite, downloads and sync.
Its private `app://podlist` origin and server bridge stay. Keep its database lock
while its OPFS database needs one. Select adapters at build time so web excludes
local code. Desktop output is `packages/web/dist-desktop`; web output stays
`packages/web/dist`. The desktop packaging script selects its own build.

Decided (standing rule): every deployment needs owner approval. No deploy was run.

## Milestones

1. Implemented: design note and local seam. Local web and Electron behaviour stays.
2. Implemented: server reads, WebSocket notifications, polling endpoint, contracts,
   Device registration vectors and View parity tests. No web adapter or deployment.
   Validation: all-package typecheck and 440 Vitest tests pass. The separate server
   suite passes all 156 tests. Contract and vector checks pass. Swift domain tests
   and all 452 Android domain/data tests pass. Changed TypeScript and JSON files
   pass Biome. Root lint has six existing errors and three warnings in untouched
   files. No requested check remains blocked.
3. Implemented: server reads, in-memory optimistic edits, stable-id retry, shared
   browser Device sequences, WebSocket catch-up and polling fallback. Builds select
   separate adapters. Web removes downloads, installation and the database lock.
   Peer playback pausing is included. No server implementation changed.
   Long Episode and Subscription lists load continuation pages as they scroll.
   `ReadChanged` and expired tokens restart from page one to the loaded depth.
   Rows replace together, preserving scroll range and id-based selection where possible.
   Subscription sorting waits until all pages load, so it never sorts only part of
   the Library. Listening metadata is read in bounded pages before computing stats.
   Validation: all-package typecheck passes. All 452 Vitest tests pass. The web
   production build and all 178 end-to-end tests pass against demo servers.
   The desktop build and all 10 Electron tests pass. All 64 changed TypeScript,
   JavaScript and JSON files pass Biome. `git diff --check` passes.
   Local dependency copies and local-listener access were needed for these checks.
   No requested check remains blocked.
4. Run approved rollout checks against the real proxy and returning installed PWAs.
   Check legacy unsent PWA edits before cutover. Old SQLite files are left intact;
   the web adapter does not import their outbox or downloads. Obtain owner approval
   for deployment. No new product decision is needed for this implementation.
