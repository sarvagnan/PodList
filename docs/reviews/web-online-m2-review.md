# Independent review: web online milestone 2

Reviewed merge `05a36994721606884810fa9cd3f4f410376cfbda` against first parent `68f8c63da73035dc62c4627ff6cdf05d8b6e53ab` using `git diff 05a3699^1 05a3699`. Context: ADR 0004 and `docs/design/web-online.md`. Review date: 11 November 2026. No implementation changes were made.

**Findings: 2 major, 1 minor; no verified blocker.**

## 1. Major — deleting a provisional Subscription does not invalidate reads

**Location:** `packages/server/src/Reads.ts:13` (cursor source), `packages/server/src/Reads.ts:127` (continuation guard). Related existing code: `packages/server/src/Catalogue.ts:22` and `packages/server/src/Subscriptions.ts:153`.

The new read and live APIs treat the maximum `catalogue_change.seq` as a complete Library revision. Catalogue triggers cover only INSERT and UPDATE. Failed Subscribe cleanup deletes its provisional Subscription without changing either cursor.

**Failing scenario:** Two existing Subscriptions sort as `zz B` and `zz C`. Another Device starts subscribing to `https://a.test/feed`. While the fetch is pending, a web reader requests `/api/reads/subscriptions?pageSize=1`: it sees the provisional Subscription, `total=3`, and a continuation with offset 1. The fetch then fails and Subscribe deletes that row. Following the continuation succeeds with `zz C`, `total=2`, and no continuation; `zz B` is skipped. Both responses report `{ state: 0, library: 3 }`. Polling and WebSocket checks also see no change, so a tab can retain the deleted Subscription until another invalidation.

**Verification:** Reproduced through the actual `Subscriptions.subscribe` implementation with an injected HTTP 500. The read was taken inside the feed-request effect, after insertion and before failure cleanup. Also reproduced the underlying DELETE behavior directly against the migrated database.

**Suggested fix:** Advance a durable monotonic Library revision on DELETE as well as INSERT/UPDATE, including cleanup paths, and use it consistently for pages and live notifications. Alternatively, make provisional rows invisible until a successful Subscribe commits. Add a regression covering a continuation issued during a failed Subscribe.

**Follow-up:** `pod-dgm`.

## 2. Major — live sockets have no effective session resource budget

**Location:** `packages/server/src/Live.ts:55` (unconditional upgrade), `packages/server/src/Live.ts:65` (per-socket SQL loop), `packages/server/src/Live.ts:72` (writes), `packages/server/src/Live.ts:87` (discarding incoming messages). Transport configuration: `packages/server/src/main.ts:55`.

There is no global or per-peer connection admission limit. Every accepted socket runs its own cursor query twice per second indefinitely. The server also supplies no `websocket.maxPayload`, leaving the pinned `ws` implementation's 100 MiB per-message default. The application silently drains all client messages despite the notification protocol requiring none. The pinned Effect writer calls `ws.send` immediately; this route adds neither an outbound-buffer limit nor a slow-consumer deadline.

**Failing scenario:** One reachable tailnet client supplies the legitimate Origin and opens many sockets. Each consumes a connection, fibers and continuing SQL work. It can also send near-100 MiB unsolicited messages on multiple sockets; each message must be assembled before the application discards it. A peer that stops reading can retain queued notifications without an application-enforced buffer ceiling. These resource costs have no configured session budget and can exhaust a small server. This is a resource-limit defect; no Origin bypass is needed or claimed.

**Verification:** A bounded local probe admitted 128 simultaneous sockets, all received their first notification, and all remained open. One accepted a 2 MiB unsolicited message and continued receiving cursor updates. The 100 MiB default, immediate `ws.send`, and missing limits were verified in the pinned transport source and server composition. Destructive exhaustion was not attempted.

**Suggested fix:** Enforce a configurable connection cap before upgrade and release admission on every exit path. Configure a small transport-level `maxPayload` and close sockets that send unexpected application messages. Bound queued outgoing bytes and disconnect slow consumers; coalesce notifications while blocked. A shared cursor watcher can also avoid multiplying SQL polling by connection count.

**Follow-up:** `pod-wv5`.

## 3. Minor — schema-valid Search and filter text can exceed SQLite's expression limit

**Location:** `packages/api/src/Reads.ts:49` (Search schema), `packages/api/src/Reads.ts:40` (filter schema), `packages/server/src/Reads.ts:133` (query preparation).

Search accepts any nonempty string, and the imported filter schema does the same for `filter.text`. `ViewQuery.compile` generates a separate three-column LIKE expression for every word. Page-size limits do not bound the resulting SQL expression tree or the count query's work.

**Failing scenario:** Let `q = Array(1000).fill("a").join(" ")`. POST `/api/reads/search` with `{ "q": q }`, or POST `/api/reads/filter` with `{ "filter": { "text": q }, "sort": "publishedDesc", "limit": null }`. Both payloads satisfy the declared schema but return an empty `500`, even with an empty Library. SQLite reports `Expression tree is too large (maximum depth 1000)`; `Effect.orDie` turns this input-dependent failure into a server defect.

**Verification:** Exercised both HTTP handlers and separately prepared the compiled query against the migrated SQLite database to confirm the error.

**Suggested fix:** Validate text length and word count before compilation, returning a documented 400 for excessive complexity. Bound podcast-id filters and buffered request-body size as well. Reflect enforced input limits in OpenAPI, and test the limits through HTTP.

**Follow-up:** `pod-4td`.

## Other checks and validation

- Existing server read, live, OpenAPI and sync suites: **78 tests passed**. Domain protocol and client-contract suites: **131 tests passed**. Local socket tests required execution outside the sandbox's listen restriction.
- Temporary probes verified the findings above and were removed after the review. No implementation or test files are included in this commit.
- Cross-origin and missing-Origin WebSocket upgrades return 403; scheme and port participate in comparison. The handler does not trust `X-Forwarded-Host`. The documented deployment must preserve Host and set `X-Forwarded-Proto`.
- Cross-origin GET and JSON POST read probes returned no CORS permission headers. A text/plain POST returned 415. A POST without Content-Type was parsed as JSON, but its response still had no CORS permission headers. No response-reading bypass was substantiated.
- Filter/search values are SQL parameters; sort fragments come from the validated sort enum. No SQL injection was substantiated.
- Continuations use HMAC verification, bind query and page size, freeze relative time, and compare both cursors. Count, page and cursors share a transaction; ordering includes id tie-breakers and View limits are applied inside the paged subquery. The deletion gap above is the verified exception to revision-based stability.
- Cursor catch-up reads durable cursors immediately and then polls; transactional pushes commit State and operation-log cursors together. No additional push/notification race was substantiated.
- The added `web` kind is covered by generated registration vectors and the TypeScript, Swift and Kotlin enum changes. `acknowledged` is optional in the response schema and is emitted only after transactional push success. No compatibility defect was substantiated.
- The served OpenAPI equals the committed generated document, including the raw live route. No additional handler/contract mismatch was substantiated.
