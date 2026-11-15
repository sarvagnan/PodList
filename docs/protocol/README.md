# PodList sync protocol (version 5)

Implementations in every language must pass these JSON vectors. No TypeScript execution or SQL parsing is needed to consume them. Use the language in [CONTEXT.md](../../CONTEXT.md). The online-only web client uses server reads and tab-memory pending edits; Android, Mac and Electron keep local databases (ADR 0011).

Start with [client duties](client-duties.md), the [operation coverage table](operation-coverage.md), and the generated [OpenAPI 3.1 file](../../packages/domain/protocol/openapi.json). The [Operation JSON Schema](../../packages/domain/protocol/operation.schema.json) is draft 2020-12. OpenAPI also contains the complete State, Subscription, Episode, View and Device schemas referenced by responses. All times named `at`, `recordedAt`, `listenedAt`, `published`, `registeredAt`, Download Rule `since` and `to` are nonnegative UTC epoch milliseconds; Positions, durations, thresholds and listening amounts are finite nonnegative seconds (fractional seconds allowed). IDs are opaque nonempty strings. Optional keys and explicit null are distinct: an absent Listening log means empty; a null Played fact means Unplayed. Array order is significant; JSON object key order is not. [Sources: Units.ts](../../packages/domain/src/Units.ts), [Ids.ts](../../packages/domain/src/Ids.ts), [State.ts](../../packages/domain/src/State.ts), [Library.ts](../../packages/domain/src/Library.ts).

## Version negotiation

The normative version registry is [Protocol.ts](../../packages/domain/src/Protocol.ts).
It generates the version inventory below, native client constants and
[sync-compatibility.json](../../packages/domain/protocol/sync-compatibility.json).
Every wire change, including optional fields, new endpoints and changes to replay
semantics, increments the protocol version. A bug fix that restores already
specified behavior is not a wire change. Versions are cumulative and frozen;
never infer compatibility from a new discriminator or skip an unknown operation.

Clients send `x-podlist-protocol-version: 5` on every `/api/sync/push` and
`/api/sync/pull` request. This is the version they can read, not an operation
allowlist. Missing means **4**, the deployed baseline before PurgePlaylist.
Invalid or pre-v4 declarations receive the structured pull refusal below; v1–v3
are archival inventories, not supported negotiation targets. A future client can
read the current log. The declaration does not grant authorization (ADR 0004).

`GET /api/health` returns `{ "status": "ok", "protocolVersion": 5 }`, with an
optional `release`. `supportedOperations` is removed: it duplicates the frozen
version registry and previously let PurgePlaylist ship under version 4. Clients
ignore that old extension list and require server version 5 for PurgePlaylist.
A server temporarily deployed with PurgePlaylist while reporting 4 must update
before new clients will offer permanent deletion.

### Push

`POST /api/sync/push` takes `{ "operations": [Operation, ...] }` in recorded order.
An Operation has `id`, `deviceId`, `sequence` (nonnegative integer), `recordedAt`
(epoch milliseconds) and `change` (`_tag` plus the variant's fields). Success is
HTTP 200 `{ "cursor": 12, "accepted": 2, "acknowledged": ["id1", "id2"] }`.
Retries use stable ids; `accepted: 0` can acknowledge an already committed batch.
A push cursor must never become the local pull cursor.

Before decoding the closed union or changing State, the server inspects every
Change discriminator. Any unknown type rejects the **whole batch** with HTTP 422:

```json
{ "_tag": "UnsupportedOperation", "serverProtocolVersion": 5,
  "unsupportedOperations": ["FutureOperation"] }
```

No operation in that batch is accepted. Known variants with invalid fields return
HTTP 400 `{"_tag":"InvalidOperation"}`; malformed envelopes return empty HTTP 400.
Previous servers may return empty HTTP 400 for an unknown discriminator. Emitters
therefore compare each operation's required version with fresh server health
before pushing extensions. Offline clients also guard every local enqueue path,
including generic edits and bring-over, against the last verified server version
(default 4). Standalone Devices need no server grant. Unsupported edits are not
partially recorded. Existing queued edits survive a server rollback and pause
until a compatible server returns. Ordinary supported local edits remain usable.

### Pull

`GET /api/sync/pull?since=12` returns HTTP 200
`{ "cursor": 15, "snapshot": null, "operations": [...] }`. For `since <= 0`, it
returns a complete State snapshot and an empty operations array. Otherwise replay
all returned operations in server order, without sorting by Device or time.

In the same database transaction as the pull, the server finds the minimum version
needed by every pending operation. If any is newer than the declared reader,
return **HTTP 426**, without a cursor, snapshot or partial operation list:

```json
{ "_tag": "UpdateRequired", "minimumProtocolVersion": 5,
  "unsupportedOperations": ["PurgePlaylist"] }
```

The client keeps its cursor and pending edits. Initial snapshots check the entire
log too, so resetting a cursor cannot bypass a refusal or silently replace State
with semantics a reader cannot maintain. A new State shape or other incompatible
wire change must additionally gate that response by its introducing version;
operation gating alone does not authorize a new snapshot shape. A v4 client with
no pending v5 operations can continue syncing. Nothing is translated or dropped.

### Paused client state

HTTP 426 `UpdateRequired`, HTTP 422 `UnsupportedOperation`, and an unknown Change
discriminator from a pre-negotiation server enter a latched compatibility state.
UpdateRequired shows **“Update PodList to keep syncing”**; UnsupportedOperation
asks to update the PodList server. These are persistent accessible status messages
with a manual Retry action. Further polling, edit, reconnect and foreground
triggers issue no sync network requests. The first failed native pass may finish
its independent Library pull, but a Library failure cannot mask the update message.
Manual retry or a new process/session clears the latch; a compatible response
clears the message. Relaunch after updating starts from the saved cursor and ids.

Android and Mac retain their SQLite outboxes and optimistic edits and keep working
locally. The online-only web client retains pending edits only in its open tab,
blocks new user edits while paused, and retains its before-unload warning. Keep
the tab open and retry after updating the server; reloading a web tab discards its
in-memory edits, as before. Playback reports may remain queued in the tab.

### Already-installed clients and deployment

Today's Android builds omit the declaration, so the server treats them as v4 and
refuses pulls containing PurgePlaylist before the Kotlin sealed decoder runs.
Their cursor and outbox stay intact. **A server cannot retrofit the new UI or
stop scheduling retries in an installed binary**: those builds still show their
existing generic HTTP failure and retry on their existing schedule until updated.
The same limitation applies to already-open old web bundles. Install the updated
client to get the paused state and actionable message. Future rollouts need no
reader-first ordering because clients implementing this rule stop safely.

Update the server and clients; only a server reporting v5 enables new purge edits.
Do not roll a server binary back past operation types already in its durable log:
an old server cannot decode that log. This mechanism protects peers and queued
work; it does not migrate a newer database/log back to an older implementation.

## Changelog and operation inventory

The historical boundaries below come from the version-bump commits:
`572962d` (v1), `7c4e82c` (v2), `78db0f3` (v3), `c186939` (v4).
Version 1 established the exported JSON Schema and replay vectors; the exact
pre-v1 wire history is **unknown**. Version 2 added Trash, restore and retention.
Version 3 added deliberate Timeline edits to State, with the same operation types.
Version 4 added permanent listening amounts, RecordListening and Listening stats.
Later optional fields, bring-over, Device kinds and query/reducer changes shipped
under v4 without individual bumps; their exact historical release boundaries are
**unknown**. The v4 registry freezes the complete deployed pre-purge baseline.
Version 5 adds PurgePlaylist and the negotiation/error behavior specified above.
The unversioned PurgePlaylist release reporting v4 is an acknowledged historical
violation, not an alternative v4 definition.

<!-- BEGIN GENERATED SYNC VERSIONS -->
| Version | Change | Readable operation types |
| --- | --- | --- |
| 1 | Initial Operation schema and conformance vectors | `AddEntry`, `MoveEntry`, `RemoveEntry`, `SetCursor`, `ReportPosition`, `MarkPlayed`, `MarkUnplayed`, `MarkSubscriptionPlayed`, `SetStar`, `CreatePlaylist`, `RenamePlaylist`, `SetClearOnPlayed`, `DeletePlaylist`, `SetActivePlaylist`, `Rewind`, `SaveView`, `DeleteView`, `SetDownloadRule`, `SetPlaybackSettings`, `SetSubscriptionOverrides` |
| 2 | Trash, RestorePlaylist and SetTrashDays | `AddEntry`, `MoveEntry`, `RemoveEntry`, `SetCursor`, `ReportPosition`, `MarkPlayed`, `MarkUnplayed`, `MarkSubscriptionPlayed`, `SetStar`, `CreatePlaylist`, `RenamePlaylist`, `SetClearOnPlayed`, `DeletePlaylist`, `RestorePlaylist`, `SetTrashDays`, `SetActivePlaylist`, `Rewind`, `SaveView`, `DeleteView`, `SetDownloadRule`, `SetPlaybackSettings`, `SetSubscriptionOverrides` |
| 3 | Deliberate Timeline edits in State | `AddEntry`, `MoveEntry`, `RemoveEntry`, `SetCursor`, `ReportPosition`, `MarkPlayed`, `MarkUnplayed`, `MarkSubscriptionPlayed`, `SetStar`, `CreatePlaylist`, `RenamePlaylist`, `SetClearOnPlayed`, `DeletePlaylist`, `RestorePlaylist`, `SetTrashDays`, `SetActivePlaylist`, `Rewind`, `SaveView`, `DeleteView`, `SetDownloadRule`, `SetPlaybackSettings`, `SetSubscriptionOverrides` |
| 4 | Permanent listening log and RecordListening; frozen deployed v4 baseline | `AddEntry`, `MoveEntry`, `RemoveEntry`, `SetCursor`, `ReportPosition`, `RecordListening`, `MarkPlayed`, `MarkUnplayed`, `MarkSubscriptionPlayed`, `SetStar`, `CreatePlaylist`, `RenamePlaylist`, `SetClearOnPlayed`, `DeletePlaylist`, `RestorePlaylist`, `SetTrashDays`, `SetActivePlaylist`, `Rewind`, `SaveView`, `DeleteView`, `SetDownloadRule`, `SetPlaybackSettings`, `SetSubscriptionOverrides` |
| 5 | PurgePlaylist; version negotiation and typed sync refusals | `AddEntry`, `MoveEntry`, `RemoveEntry`, `SetCursor`, `ReportPosition`, `RecordListening`, `MarkPlayed`, `MarkUnplayed`, `MarkSubscriptionPlayed`, `SetStar`, `CreatePlaylist`, `RenamePlaylist`, `SetClearOnPlayed`, `DeletePlaylist`, `RestorePlaylist`, `PurgePlaylist`, `SetTrashDays`, `SetActivePlaylist`, `Rewind`, `SaveView`, `DeleteView`, `SetDownloadRule`, `SetPlaybackSettings`, `SetSubscriptionOverrides` |
<!-- END GENERATED SYNC VERSIONS -->

## Adding an operation or changing the wire

1. Increment `Protocol.version`. Append a frozen registry entry with the complete
   cumulative operation set and every wire/reducer change; preserve all prior entries.
2. Implement the schema, reducer and emitters on every platform. Declare only a
   version the client fully implements, including snapshots, Library and read shapes.
3. Gate emission and enqueue by the server version, using the shared generated
   minimum-version data. Bring-over and pending pushes must use the same rule.
4. Gate any new response shape by its introducing version as well as operation
   log types. Preserve the whole-batch refusal and unchanged-cursor invariants.
5. Add replay scenarios in `packages/domain/scripts/scenarios.ts` or the contract
   scenarios, compatibility cases, and server/client paused-state tests. Include
   duplicate delivery, mixed batches, initial snapshots, old peers and rollback.
6. Run `pnpm --filter @podlist/domain protocol`. Commit the schemas, OpenAPI,
   vectors, generated native constants and this generated inventory together. Run
   `pnpm format` after regeneration to apply repository JSON formatting.
7. Run `pnpm check`, Swift tests and builds, and Android tests/lint. Document the
   changelog, rollout and any migration requirement before releasing.

## Running the contract in another language

- For each [sync vector](../../packages/domain/protocol/vectors), decode `initial`, then apply `operations` in their array order, deduplicating by operation id. Use each operation's `recordedAt` as the change time. Compare the full result with `expected`. When `checkpoints` exists, compare State after operation index *i* with checkpoint *i*, including duplicate deliveries. Keep a seen-id set across incremental replays; it is not part of State. No sort by Device, `sequence`, recording time or listen time is allowed. [State.ts](../../packages/domain/src/State.ts), [Operation.ts](../../packages/domain/src/Operation.ts).
- For [View vectors](../../packages/domain/protocol/views.json), load the full `subscriptions`, `episodes` and `state` fixture, and evaluate every `cases[].view` at the supplied `now`. `expected` is the exact array of matching Episode ids in exact order. Reset to the fixture between cases; when a case supplies `episodes`, use that array instead of the shared Episodes (the binary-order cases); a case-level `now` overrides the shared clock for rolling-date boundaries. The TypeScript suite executes the real View compiler against real SQLite with the shared migrations and indexes. [client-contract.test.ts](../../packages/domain/test/client-contract.test.ts).
- For [Listening measurement vectors](../../packages/domain/protocol/listening.json), evaluate each `samples[]` independently. A null `before` means the boundary was reset (first sample, pause, seek, discontinuity, or speed change). `offsetMinutes` has the sign of UTC minus local, e.g. India is -330. Attach `subscriptionId` to each measured amount and compare the exact array. Separately run every `thresholds[]` Position/duration/Subscription-threshold triple and compare its boolean `expected`. `sessions[]` additionally specifies player lifecycle actions at milliseconds relative to a local-noon start (the calendar date is arbitrary for lifecycle cases), with a report interval of zero for deterministic assertions. Load the given initial Episode as the Default Playlist Cursor, unplayed, with the supplied settings and Entry Position. Compare cumulative seconds after each step and final Played/Entry Position; the real browser Playback service runs these cases. End-of-audio always finishes, even when duration is unknown; the boolean tests cover Position-based finishing only. [Listening.ts](../../packages/domain/src/Listening.ts), [PlayedRules.ts](../../packages/domain/src/PlayedRules.ts), [Playback.ts](../../packages/web/src/playback/Playback.ts).
- For [server vectors](../../packages/domain/protocol/server.json), start each vector with its Library and `initial` State. Push each `batches[].operations` array in turn. Compare accepted count, server cursor, the entire logged concrete operations array, State and Subscriptions after each batch. `expectedOperations` includes the original intention followed by its server-generated operations. Retried batches reuse ids. These exercise Library-dependent intentions which intentionally do nothing in the shared State reducer. A native client replays the returned concrete operations; it must not expand the intention a second time. [SyncStore.ts](../../packages/server/src/SyncStore.ts), [server conformance runner](../../packages/server/test/protocol.test.ts).

Regenerate with `pnpm --filter @podlist/domain protocol`, then `pnpm exec biome check --write packages/domain/protocol packages/domain/scripts packages/api/src`. The suite compares committed documents with generation output, checks every Operation.Change member has a replay vector, and checks the coverage table is current. Expected View and measurement outcomes are authored as data, independently of the compiler and sampler. Sync State outcomes and checkpoints are exported from the reference reducer and committed for independent implementations; review changes to those expected States as changes to the contract. Server expansion lists are authored independently of the server. [exporter](../../packages/domain/scripts/export-protocol.ts), [protocol tests](../../packages/domain/test/protocol.test.ts).

## Merge and State rules

Changes run in arrival order. Aside from Position's latest-listen rule, later arriving writes win regardless of recorded time or Device. Missing Playlist/Entry targets leave State unchanged. All changes also purge Trash older than the retention boundary, using that operation's recorded time. State does not validate Episode existence against the Library. The server serializes pushes and commits State and its operation log atomically. Repeated ids within or across pushes are skipped; `accepted` counts original intentions, while cursor counts logged intentions plus server expansions. [State.ts](../../packages/domain/src/State.ts), [SyncStore.ts](../../packages/server/src/SyncStore.ts).

An Entry is unique within its Playlist. Play Now inserts before the Cursor and selects the inserted Entry; Play Next inserts immediately after it; Play Last appends. Existing Entries move and keep Position. Play Now on the Cursor is a no-op. Moving the Cursor Entry with Play Next/Last first selects its old successor; if there is no valid Cursor, an add appends and selects itself. MoveEntry inserts after its anchor, or first for null; a missing or self anchor does nothing. Removing the Cursor selects its following Entry or null. SetCursor accepts null or an existing Entry only. [PlaylistRules.ts](../../packages/domain/src/PlaylistRules.ts).

The Default Playlist cannot be renamed or deleted. Duplicate CreatePlaylist does nothing. Deleting the Active Playlist makes Default Active and puts the entire deleted Playlist in Trash. Restore appends a retained Playlist without making it Active; an existing Playlist outside Trash with the same id blocks restore. Trash retention defaults to 30 days; exactly the cutoff is still retained, older is expired. SetTrashDays immediately applies the new retention on that operation. [State.ts](../../packages/domain/src/State.ts).

Played and Starred are Episode facts shared by all Playlists. MarkPlayed with Playback source records History only in the source Playlist if it has the Entry; History is newest first, capped at 500. In that Playlist an Entry kept without Clear on Played resets to zero and its Cursor advances if current. Clear on Played removes the Episode's Entry everywhere it is enabled, including for manual marks and Starred Episodes. Enabling Clear on Played does not clear already Played Entries. Manual marks add no History. MarkUnplayed clears the Played fact but does not restore Entries; it preserves a Star. Removing both facts removes the EpisodeState record. [PlayedRules.ts](../../packages/domain/src/PlayedRules.ts), [Playlist.ts](../../packages/domain/src/Playlist.ts), [State.ts](../../packages/domain/src/State.ts).

ReportPosition updates only an existing Entry and does not move its Cursor. A strictly older `listenedAt` leaves its Position unchanged; equal time uses the later arrival. Its Listening log amounts still add, even if Position is stale, the Entry is gone, or the Playlist is gone. RecordListening only adds amounts. Operation-id deduplication makes retries safe; overlapping listening on different Devices adds independently. Unplayed, Rewind, deletion and Trash expiry never subtract Listening log amounts. [State.ts](../../packages/domain/src/State.ts), [Listening.ts](../../packages/domain/src/Listening.ts).

The Listening Timeline samples at most once per minute per Episode: any point less than 60,000 ms away suppresses the new point; exactly one minute is allowed. Points sort by time. Keep the inclusive 30-day window measured from the newest point, rejecting an incoming point older than that window. A stale Position report can still contribute an older retained Timeline point. Deliberate Playlist edits are recorded separately, time sorted, retaining 30 days and the last 300 edits. [TimelineRules.ts](../../packages/domain/src/TimelineRules.ts).

Rewind uses the last Timeline point at or before `to`; no point or missing Playlist means no-op. History finished strictly after `to` is removed. Only still-current Playback Played facts from this Playlist after `to` become Unplayed. Finished Entries return before their old following Entry if present, otherwise before the current Cursor, otherwise at the end, without duplicating Entries. The target Entry is restored if needed and selected at the Timeline Position. Entries with Timeline points after `to` reset to their last Position at/before `to` or zero, with Position time set to the Rewind operation time. Other deliberate adds/reorders and manual Played facts survive. The Timeline itself remains. [State.ts](../../packages/domain/src/State.ts).

SaveView replaces by id in place or appends; DeleteView removes by id. SetDownloadRule replaces only the matching Subscription/Device pair, appending the replacement. When entering All New from any other mode (including no rule), the reducer sets `since` to the operation’s `recordedAt`. Leaving All New removes `since`; consecutive All New writes, including cap edits, preserve the current activation. Any supplied `since` is ignored by the reducer. Arrival order still wins, including an older recorded change that arrives later. The activation is part of synced State, so snapshots and an off/on cycle in one pull preserve it. Legacy All New rules may omit `since`; clients retain their existing local `ruleSince` until a real mode transition, or use first observation when none exists. SetPlaybackSettings replaces all global defaults. SetSubscriptionOverrides replaces the Subscription's whole override document and threshold in the Library; it is not a merge of individual settings. MarkSubscriptionPlayed expands on the server into manual MarkPlayed operations for the Subscription's currently Unplayed Episodes, ordered by Published ascending, observing earlier changes in the push. Generated ids are `intention-id:episode-id`, and Device, sequence and recording time are copied. Both intentions remain in the log. A missing Subscription has no Library effect. [State.ts](../../packages/domain/src/State.ts), [SyncStore.ts](../../packages/server/src/SyncStore.ts).

## Bringing a Standalone Library to a server

After Subscribe and a normal Library pull, clients can repair remaining identities
with `POST /api/subscriptions/bring-over`. The JSON body has two required arrays:

- `subscriptions`: Subscription metadata without `id`, keyed by exact `feedUrl`.
  Include `title`, `author`, `description`, `artwork`, `subscribedAt`,
  `unsubscribedAt`, `playedThreshold` and `playbackSettings`. Explicit null
  `unsubscribedAt` means active; a timestamp means removed.
- `episodes`: Episode metadata without `id` or `subscriptionId`, plus `feedUrl`,
  keyed by exact `(feedUrl, guid)`. Include `title`, `description`, `published`,
  `duration`, `audioUrl`, `artwork`, `chapters` and `audioUpdatedAt`.

The server inserts only missing identities in one transaction, assigns server ids
and never updates an existing row, including its removed status, metadata or
settings. Duplicate identities and repeated requests are safe; the first inserted
metadata wins. It does not fetch or parse feeds. An Episode's Subscription must
already exist or be included in the same request; otherwise the whole transaction
rolls back with HTTP 400 JSON `{ "_tag": "MissingSubscription", "feedUrl": "..." }`.
Malformed input returns the usual empty HTTP 400.

Success is HTTP 204 with no body. Obtain the resulting ids and authoritative rows
through paged `GET /api/library/changes?since=...`, then match by feed address and
guid again. Unchanged rows produce no new Catalogue change; clients must retain
their existing mirror. Removed Subscriptions are not polled or exported as active.
Their stored Episodes follow the existing Orphaned visibility rule: only Entries
and Stars remain visible. A Listening log reference alone does not make an Episode
visible. Imported active Subscriptions participate in ordinary polling.

Queue the ordered State replay only after every needed reference has a mapping.
Keep stable operation ids and use ordinary push/pull; this request never imports
State or audio. On HTTP 404, Android preserves its previous partial-transfer
behaviour and explanation for older servers. Other failures are retryable without
discarding references. This endpoint originally shipped during version 4 without a separate bump; no migration is needed. Future endpoints follow the version rule above.

## Feed parsing on a Standalone Device

[Feed vectors](../../packages/domain/protocol/feeds.json) are generated from the
server's `FeedParser.ts` by `packages/domain/scripts/feed-vectors.ts`. Each `feeds`
case supplies XML and either a complete `expected` parsed feed or `error: true`.
Each `durations` case supplies nullable text and a nullable number of seconds.
Compare numbers by value. Both the server's TypeScript tests and Android `:data`
JVM tests execute these fixtures. Regenerate with the ordinary protocol exporter.

RSS requires a channel and title. Items without an enclosure URL are skipped;
guid falls back to that audio URL. The vectors define namespace field precedence,
CDATA/escaping, publisher dates, absent metadata and duration formats. XML and OPML
must reject DTD/entity declarations and external resources and apply an 8 MiB
UTF-8 size bound. The parsers do not fetch anything while parsing.

## View evaluation without SQL

Start with Episodes whose Subscription is present and either still subscribed, or whose Episode is Starred or an Entry in any Playlist outside Trash (Orphaned Episodes). Trash Entries do not retain an Episode. Every supplied condition must match. Published uses the Episode's Published time, never when it was first received. LastDays means `published >= now - days * 86400000`, inclusive, without an upper bound; Between uses inclusive non-null endpoints, with null meaning unbounded. These are millisecond comparisons, not local-midnight date arithmetic. [ViewQuery.ts](../../packages/domain/src/ViewQuery.ts).

Podcasts includes or excludes the exact Subscription ids. Mentions splits trimmed text on whitespace; each word must appear as a substring somewhere in the Episode title, show notes or podcast name, and words may match different fields. `%`, `_` and backslash are literal characters. Mentions ignores case and accents using Unicode 17.0.0: canonical decomposition (NFD), full default non-Turkic case folding, NFD again, removal of accent marks, then replacement of the accented letters that have no decomposition (ı ł ø đ ħ ŧ æ œ). Accent marks are the optional ones: Latin, Greek and Cyrillic diacritics, Hebrew points and Arabic harakat. Marks that spell a different sound are kept, such as Indic and Thai vowel signs and kana voicing. `packages/domain/scripts/mentions-fold.py` is the exact definition. Apply this to each word and each field before literal substring matching. `cafe`, `CAFÉ` and decomposed `Café` match `Café`; `ÉTÉ` matches `été`; `STRASSE` matches `Straße`; Cyrillic case folds too. `I`, `i`, `İ` and dotless `ı` all fold to `i`, the same in every locale. Whitespace-only text behaves like no condition. The generated pinned scalar table and algorithmic Hangul decomposition are identical in TypeScript and Kotlin and use no host Unicode APIs. SQLite searches folded companion columns maintained on Library writes; shared migration 4 backfills existing rows in bounded batches inside the migration transaction. This avoids ICU and avoids folding the entire Library on each search. [Unicode algorithm](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/), [fold generator](../../packages/domain/scripts/mentions-fold.py), [migration](../../packages/domain/src/Sql.ts). [ViewQuery.ts](../../packages/domain/src/ViewQuery.ts), [View vectors](../../packages/domain/protocol/views.json).

Played requires a Played fact. Unplayed includes in progress. In progress requires Unplayed and a positive Position in at least one Entry in any Playlist outside Trash; a Played Episode with a positive Position is excluded. Starred supports true and false. The condition called “In a Playlist” currently offers only Any or Not in any Playlist (`notInAnyPlaylist: true`); there is no positive membership condition or Playlist-id condition in this version. Length min/max are inclusive seconds, exclude unknown durations, and allow zero. [ViewQuery.ts](../../packages/domain/src/ViewQuery.ts), [View.ts](../../packages/domain/src/View.ts), [ViewForm.tsx](../../packages/web/src/components/views/ViewForm.tsx).

Sort by Published ascending/descending, or Length ascending/descending. Unknown Length always sorts last. Every tie sorts by Episode id ascending using SQLite's default binary text order (do not use a localized string comparator). Apply Show limit after all conditions and sorting; null means unlimited. Views are evaluated afresh rather than storing memberships. [ViewQuery.ts](../../packages/domain/src/ViewQuery.ts), [View.ts](../../packages/domain/src/View.ts).

## Fixes and decisions recorded by Phase 0

Two bugs were fixed with regression tests: a late Timeline point could reintroduce data older than 30 days, and server MarkSubscriptionPlayed expansion ignored earlier changes in the same push. They restore the existing retention and ordered-replay contract with no new wire shape or version bump. [Timeline regression](../../packages/domain/test/rewind.test.ts), [server vectors](../../packages/domain/protocol/server.json).

Owner decisions settled on 9 November 2026: Mentions ignores case and accents; All New starts from its latest activation; Episodes finished includes stored Episodes of removed Subscriptions; “In a Playlist” keeps only Any and Not in any Playlist. LastDays continues to admit future Published dates. Equal `listenedAt` Position ties use later arrival while the Timeline keeps the first nearby sample. Whitespace-only Mentions matches everything. Server Subscription expansion and All New caps keep their existing ordering without a secondary tie-break for equal Published dates. Listening measurement continues using the ending timezone offset for the whole sample and accepting small unannounced seeks within the jitter allowance. [client duties](client-duties.md), [State.ts](../../packages/domain/src/State.ts), [SyncStore.ts](../../packages/server/src/SyncStore.ts).

Device.kind accepts `pwa`, `desktop`, `android` and `web`. The generated `devices.json` registration vectors cover all four kinds. Web uses one Device per browser profile. Historically, `DownloadRule.since` shipped under version 4 as an optional State/schema field while existing operations remained decodable. That history is retained; future additive fields require a version bump. Older rules and persisted databases upgrade without invented activation dates. Clients must implement the updated reducer and Mentions algorithm to conform to the revised behavior; older clients retain their old download/search behavior until upgraded.
