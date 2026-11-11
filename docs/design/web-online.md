# Online-only web client

Phase 4 of [the platform plan](../plans/platform-clients.md), under `pod-apx.2`.
[ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md) sets the split.
Milestones 1 and 2 are implemented. Web and Electron still use local SQLite.

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
Operation or reducer changes were made. Milestone 3 must persist the opaque profile
id and coordinate operation sequences across tabs. Do not register each tab or
reuse Electron's Device.

Decided (owner, 11 Nov 2026): failed edits stay in the tab with visible retry.
Use stable operation ids with `/api/sync/push`. Its `acknowledged` array reports all
submitted ids committed by the server, including retries. `accepted` still counts
only new intentions. A missing response leaves delivery unknown; retry the same ids.
The whole push is transactional. Older servers may omit `acknowledged`.

Milestone 3 will keep optimistic edits in memory while the tab is open. `record`
accepts the edit; status tracks delivery. Disable new edits while known offline.
Keep no durable offline outbox. Adapt the typed-edit journal and Listening reports
to this lifetime. Today's local `record` still returns after persistence.

`pod-apx.3` owns many-tab playback. Use `BroadcastChannel`: Play in one tab pauses
its peers in the same browser. Other Devices stay independent. This must be ready
before removing the web tab lock.

## Build split

At cutover, web selects the server service at the composition root. Remove its SQLite
worker, OPFS downloads and Download Rules. Hide download controls and offline promises.
Remove service worker registration, precache, install manifest and install prompts.
Remove `TabGate` and the database tab lock from web. Keep icons and navigation.
Retire old service workers and caches so returning browsers receive the new client.

Electron keeps the React screens, `LocalClient`, SQLite, downloads and sync.
Its private `app://podlist` origin and server bridge stay. Keep its database lock
while its OPFS database needs one. Select adapters at build time so web excludes
local code. Milestones 1 and 2 make no build selection or PWA changes.

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
3. Add the server adapter and online failure handling. Split builds and retire the PWA.
   Integrate `pod-apx.3` before removing the lock. Check web and Electron separately.
4. Run client reconnect checks and approved rollout checks. Obtain owner approval
   for deployment. No further owner decision is needed for milestone 2.
