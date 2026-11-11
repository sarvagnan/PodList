# Online-only web client

Phase 4 of [the platform plan](../plans/platform-clients.md), under `pod-apx.2`.
[ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md) sets the split.
This first pass changes no behaviour. Both builds still use local SQLite.

## Seam

`src/data/DataLayer.ts` is the Effect service for screens and playback.
`app/data.ts` keeps the React atoms and their existing refresh triggers.
The service returns domain values, Maps and Sets. It exposes no SQL.

- Reads: Entry Episode summaries, Subscription list and detail, saved View results,
  unsaved filters, View counts, Episode detail and stats metadata.
- Playback reads: title, host audio URL, Artwork, duration, Subscription id,
  Played threshold, Playback Settings and stored Chapters. Chapter resolution is separate.
- State: observable State and status, Device id, `record(change)`, `sync` and
  `runInBackground`. Status includes pending edits, last sync, errors and readiness.
- Library updates invalidate `catalogueKey`. State changes refresh dependent atoms.

`LocalDataLayer.ts` holds the queries formerly in `app/data.ts` and playback.
It delegates writes, State and lifecycle to the existing `SyncEngine`.
The engine keeps the durable outbox, confirmed State, cursors and sync scheduler.
Those details stay behind the service. Row actions and Library actions use it too.
`LocalClient.ts` composes SQLite, the engine, downloads and Download Rules.

## Server reads

The API contract is in `packages/api/src`. HTTP handlers are in `packages/server/src/Http.ts`.
The generated contract is `packages/domain/protocol/openapi.json`.
The following reads are proposed. They do not exist yet.

- Views: saved View results and unsaved `{ filter, sort, limit }` results.
  Run the shared `ViewQuery.compile` against the server's SQLite schema and indexes.
  Do not add a second filter evaluator. Preserve Library visibility, Mentions,
  Published ordering, LastDays and View limits. Counts count the limited result, as today.
- Counts: all saved View counts in one request. Subscription summaries and detail
  also need Episode and Unplayed counts, overrides and removed Subscription lookup.
- Episodes: batched summaries by id, title lookup and Episode detail. Include the
  playback metadata above. Keep Artwork fallback and the existing Chapters endpoint.
- Stats: podcast names, including former Subscriptions, and stored Episode ids.
  Combine these with State using the existing Listening rules. Keep the viewing
  Device's calendar and include stored Episodes of removed Subscriptions.
- State: a current snapshot with its operation cursor. Reuse
  `/api/sync/pull?since=0` initially. Keep `/api/sync/push` for writes and stable
  operation ids for retries. Keep existing Library, Directory, OPML and media APIs.

New contracts and handlers belong in milestone 2. Regenerate OpenAPI and test reads
against the shared View vectors and today's local results.

Owner decision: cap and page large result sets. Recommend bounded pages with stable
continuation and batch summaries; preserve the View limit across pages.

## Open tabs and writes

Every open tab must learn about State and Library changes, including feed refreshes,
Subscription overrides and changes from native apps. Notifications invalidate reads;
they do not carry a second copy of the Library. Fetch fresh State and affected reads
on reconnect and on return to the tab. A missed notification must not leave stale data.

Owner decision: live transport. Recommend SSE with State and Library cursors,
reconnect catch-up and a polling fallback. Each tab can connect independently first.

Owner decision: browser Device identity. Recommend one persistent opaque id per browser
profile and a new `web` kind. Coordinate operation sequence allocation across tabs.
Do not reuse Electron's Device or register each tab as a separate installation.

Owner decision: failed web edits. Recommend optimistic edits held in memory while
the tab is open, with pending status and visible retry on failed sends. Disable new
edits while known offline. Keep no durable offline outbox. `record` accepts the edit;
status tracks delivery. Milestone 3 must adapt the typed-edit journal and Listening
reports to this lifetime. Today's local `record` still returns after persistence.

`pod-apx.3` owns many-tab playback. Use `BroadcastChannel`: Play in one tab pauses
its peers in the same browser. Other Devices stay independent. This is separate from
State refresh and server sync. It must be ready before removing the web tab lock.

## Build split

At cutover, web selects the server service at the composition root. Remove its SQLite
worker, OPFS downloads and Download Rules. Hide download controls and offline promises.
Remove its service worker registration, precache, install manifest and install prompts.
Remove `TabGate` and the database tab lock from web. Keep icons and ordinary navigation.
Retire old service workers and caches so returning browsers receive the new client.

Electron keeps the bundled React screens, `LocalClient`, SQLite, downloads and sync.
Its private `app://podlist` origin and server bridge stay. Keep its database lock while
its OPFS database needs one. Select adapters at build time so web excludes local code.
No build selection or PWA removal happens in milestone 1.

Owner decision: deployment. Recommend a separate approved rollout after contract,
web, Electron and service-worker retirement checks. Every deploy needs owner approval.

## Milestones

1. Add this note and the seam. Keep local behaviour in web and Electron. Run existing checks.
2. Add server reads and live notifications. Test contracts and regenerate OpenAPI. No deploy.
3. Add the server adapter and online failure handling. Split builds and retire the PWA.
   Integrate `pod-apx.3` before removing the lock. Check web and Electron separately.
4. Run parity and reconnect checks. Obtain owner approval for deployment.
