# Online-only web client

Phase 4 of [the platform plan](../plans/platform-clients.md), under `pod-apx.2`.
[ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md) sets the split.
Milestones 1–4 are implemented. Web uses server reads and in-memory pending edits.
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
Server migration 0004 also records Subscription and Episode DELETEs in the durable Library change log, including failed
Subscribe cleanup. A provisional row that was readable before cleanup invalidates
continuations and live readers when removed. Changes rolled back inside a single
transaction never become readable and need no separate invalidation.

Read query budgets: Search `q` and `filter.text` allow at most 1,024 characters
and 32 whitespace-separated words; whitespace-only text keeps its existing meaning.
Podcast filters allow at most 200 Subscription ids, each at most 256 characters.
The API schema rejects excess input with 400 before query compilation. The server
also validates saved Views and direct query-builder calls, returning
`400 InvalidReadQuery` for over-budget queries or compilation failures (including
View counts). Native/persisted View schemas keep their existing shape. JSON bodies
under `/api/reads/` are capped at 64 KiB before parsing, including chunked requests;
excess bodies return 413. All request and response field names remain compatible.

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
15 seconds and stops the loop when the peer closes. Transport ping/pong runs every
15 seconds; a missing pong closes the connection by the next tick (at most 30 seconds).
Browsers answer these control frames automatically; clients send no application messages.

Live resource budgets are 64 concurrent sockets per server, 8 per browser profile,
and 32 per direct peer IP. Pass optional `deviceId` (1–128 characters) with the
profile's existing Device id; omitted ids share the peer's 8-socket bucket for older
clients. Device ids are self-reported, not authentication; the peer cap also applies
when ids rotate. Forwarded IP headers are ignored. Admission returns 429 before
upgrade and releases capacity on every disconnect, failure or cancellation.
Inbound messages (including reassembled fragments) are capped at 1 KiB by the
transport; excess closes with 1009. Any application message closes with 1008 and a
1-second forced-close grace. Outbound sends include queued bytes plus the next UTF-8
frame under a 16 KiB ceiling; overflow terminates the socket. An outstanding write
must complete within 5 seconds; newer writes cannot extend that deadline. There is
no application notification queue: the next cursor check coalesces changes. Slow
consumers disconnect and catch up from durable cursors after reconnect or polling.
These limits live in `packages/server/src/LiveSocket.ts`.

If a socket cannot connect, poll `GET /api/live/cursors`, compare both cursors and
refresh changed reads. The
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
them. Normal web typed edits record directly into this memory. The startup
carry-over recovers the old browser journal before the online app opens.
Electron still persists before returning.

Playback keeps the shared Position, Played and Listening rules. A web report is
accepted into tab memory before its measured amounts are cleared. Reports can keep
the playing tail pending while disconnected. They use the same stable-id retry.
Closing the tab can lose this tail. Page lifecycle upload remains best effort.

The `pod-apx.3` behavior is integrated here. `BroadcastChannel` makes Play in one
tab pause its peers in the same browser. Pausing uses normal Position and Listening
flushes. Other Devices stay independent. The web tab lock is removed.

## Build split

Vite selects `WebClient` for web and `DesktopClient` for `--mode desktop`. Normal web
startup excludes SQLite, OPFS downloads, Download Rules and `TabGate`. Returning
PWA profiles lazy-load SQLite solely for the one-time carry-over described below.
Download controls and offline promises are hidden. Icons and navigation stay.
There is no install manifest, precache or service worker registration. A retirement
script at the old `/sw.js` path waits for existing controlled pages to close, then
takes control without a fetch handler. The next launch reaches the online build.
It deliberately omits `skipWaiting`: the old Vite PWA `autoUpdate` listener would
otherwise reload live pages on activation. It does not reload pages or delete caches:
an old page may still hold unreported playback in memory. The new startup gate
unregisters the old worker and clears app caches after safe carry-over, including
profiles with no old database.

Electron keeps the React screens, `LocalClient`, SQLite, downloads and sync.
Its private `app://podlist` origin and server bridge stay. Keep its database lock
while its OPFS database needs one. Select adapters at build time; web only loads
the local database reader when recovering an old installation. Desktop output is
`packages/web/dist-desktop`; web output stays `packages/web/dist`. The desktop
packaging script selects its own build.

Decided (standing rule): every deployment needs owner approval. No deploy was run.

## PWA carry-over before the online app opens

`src/upgrade/PwaCarryOver.ts` detects the old `podlist.db` using the actual
AccessHandlePoolVFS headers in the same origin's OPFS `opfs` directory. It never
opens a missing database to probe for one. Under the old `podlist-local-database`
Web Lock, it opens SQLite without starting the old app or running migrations.
Another live PWA must close normally first; the gate does not steal its lock or
force a reload. New tabs queue behind a separate carry-over lock before claiming
the old database lock, so only one recovers at once and simultaneous fresh loads
do not incorrectly report another PWA as open.

It reads `outbox ORDER BY seq`, preserving each Operation's id, Device id, sequence,
timestamp and change. Persisted ReportPosition and RecordListening entries are
Operations in this outbox, not separate unsent tables. Confirmed/optimistic State,
History, Timeline and Listening totals must never be converted back into reports:
that would count synced listening twice. The old typed-edit localStorage journal
is staged into the outbox transactionally with its stable entry ids and the old
Device's next sequences before pushing. Corrupt/unreadable data blocks the gate
and remains available for recovery.

Pushes use the existing `Transport.push` path in batches of 100. They remain
attributed to the old `pwa` Device even though normal online edits use the new
profile `web` Device. Protocol v4 permits this: the tailnet authenticates requests,
the Operation supplies its Device id, and SyncStore deduplicates by Operation id,
without binding a browser session to a Device or rejecting an old sequence.
An unregistered legacy Device is registered as `pwa` before its first push.

Only an explicit `acknowledged` id for every Operation in a batch advances a durable
carry-over cursor. A server that omits these ids must be upgraded before retirement;
`accepted: 0` alone does not authorize deleting data. A lost response resends the
same ids, so the server skips already committed Listening amounts. Acknowledged
prefixes are skipped on reload. The complete original outbox remains in SQLite
until every batch is acknowledged and a durable completion marker is saved.
Then the reader closes, the old DB and its sidecar files are removed, the root
service worker is unregistered, and `artwork`/`workbox-*` caches are cleared.
Cleanup failures also retry, using the durable acknowledgement cursor without
pushing acknowledged Operations again, while still checking for new old-PWA edits.
Other databases, registrations and caches are left alone. Legacy audio downloads
are not imported into the online player.

The gate shows “Sending N changes saved by the previous version…” and blocks new
edits/playback until recovery finishes. Failure preserves unsent data, displays
Retry, retries when connectivity returns, and resumes on the next page load.
Position and Listening amounts still held only in the old page's JS memory have
never reached SQLite and cannot be recovered after it closes/crashes. Before an
approved cutover, pause playback in the old PWA while online, wait for sync, and
confirm its outbox is empty, then close all old tabs/installed windows and reopen.
This is a belt-and-braces check, not a replacement for the carry-over.

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
4. Implemented: resumable acknowledged legacy outbox/Position/Listening carry-over,
   typed-edit journal recovery and deferred database/worker/cache retirement.
   Browser tests exercise real OPFS recovery, interrupted/lost-response retries,
   retained data on failure, missing databases, empty outboxes and worker cleanup.
5. Still before PWA retirement: run approved rollout checks through the real HTTPS
   proxy on returning installed PWAs, including an intentionally pending outbox,
   an interrupted upload and a second launch. Verify the deployed server returns
   committed-id acknowledgements, the old Device remains the source of recovered
   edits, Listening is counted once, OPFS is removed only after acknowledgement,
   and the old worker/caches disappear even for an empty outbox. First open the old
   PWA online, pause and verify an empty outbox on the real user device. Confirm a
   still-open old tab shows the close-and-retry gate rather than being reloaded.
   Test on the exact same origin (scheme/host/port); another origin cannot read
   browser storage. Obtain owner deployment approval. No further product decision
   is required; real-device rollout validation and deployment approval need an owner.
