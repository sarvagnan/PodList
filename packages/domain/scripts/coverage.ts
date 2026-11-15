import { Operation } from "../src/index.ts"
import { buildVectors } from "./protocol.ts"
import { buildServerVectors } from "./server-vectors.ts"

const purgeCompatibility = `
## PurgePlaylist compatibility and rollout

PurgePlaylist is a new Change discriminator, not a backwards-compatible change for
operation readers. The sync envelope remains version 4. Version 4 alone does not
imply support: GET /api/health now optionally advertises
\`supportedOperations: ["PurgePlaylist"]\`. Missing or empty means unsupported.
This is an additive health field, not a general version-negotiation handshake.

**Previous server:** its PushRequest schema does not recognize PurgePlaylist and
rejects the entire push with an empty HTTP 400 before committing any operations.
The Mac sync client retains that outbox batch and does not advance its State pull
cursor, so blindly queuing a purge would block subsequent State sync (the separate
Library stream can still advance). Deploy the updated server before using Mac
permanent deletion. Mac checks fresh health before deleting, then guards every
enqueue path, including generic edits and Standalone bring-over. Unsupported or
unreachable servers leave Trash and the outbox unchanged and show a retry/update
error. Ordinary edits continue syncing. Standalone deletion needs no server.
Bring-over of a local log containing a purge waits for support before importing or
queuing it, retaining the source Library. Push also rechecks support for already
queued purges after restart/server rollback. Such existing operations are retained
with an actionable error until the supporting server returns; they are never
silently dropped. That pending batch still blocks State sync during the rollback.

**Already-installed Android without this change:** Kotlin's sealed Change decoder
throws on the unknown PurgePlaylist discriminator. \`ignoreUnknownKeys = true\`
allows extra object fields, not unknown sealed variants. Decoding the whole pull
fails before commitPull, so the State cursor and outbox acknowledgement stay put;
retrying the same incremental pull fails again. Library sync remains independent.
A first-sync State snapshot has no new fields and is readable, but this is not an
automatic recovery path for an existing installation. Update every Android
installation that shares this server before emitting a purge. This branch adds
the Kotlin decoder, reducer and bring-over mapping; the shared purge vector
exercises replay, no-ops and duplicate delivery. The new health capability gates
Mac writers only; it cannot protect an Android binary already installed.

**Web:** the shared TypeScript Change schema and State reducer are sufficient;
ServerDataLayer and the desktop SyncEngine already decode/replay that shared
contract. There is no separate web reducer or database migration, and this change
does not add a web permanent-delete control. Deploy/reload the rebuilt web bundle
before emitting purges: an already-open old bundle can reject the unknown variant
until refreshed, just as other old operation readers do.

**Required order:** update Android readers (and other retained older clients),
deploy the updated server and web bundle, then use the updated Mac client's
permanent deletion. A guarded Mac can be installed earlier, but permanent deletion
on a server connection stays unavailable until the server advertises support.
Do not roll back to an older server binary once its operation log contains purges:
the older decoder cannot read those log entries. No automatic reader upgrade,
operation translation or safe log downgrade is provided.

Sources: [HTTP schemas](../../packages/api/src/Sync.ts),
[health capability](../../packages/api/src/System.ts),
[Mac sync and health checks](../../apps/apple/Sources/PodListData/SyncClient.swift),
[Mac enqueue guards](../../apps/apple/Sources/PodListData/LocalDatabase.swift),
[Android wire decoder](../../apps/android/domain/src/main/kotlin/app/podlist/domain/Models.kt),
[Android sync](../../apps/android/data/src/main/kotlin/app/podlist/data/SyncClient.kt),
[web server data](../../packages/web/src/data/ServerDataLayer.ts),
[desktop sync](../../packages/web/src/sync/SyncEngine.ts).
`

/** The audit table is generated from the same committed vector sources as the tests. */
export const operationCoverage = () => {
  const vectors = buildVectors()
  const server = buildServerVectors()
  const rows = Operation.Change.members.map((member) => {
    const ast = member.fields._tag.ast
    if (ast._tag !== "Literal") throw new Error("Expected literal discriminator")
    const tag = ast.literal
    const matches = vectors.filter((v) => v.operations.some((o) => o.change._tag === tag))
    const serverMatches = server.filter((v) =>
      v.batches.some((b) => b.operations.some((o) => o.change._tag === tag))
    )
    return `| ${tag} | ${matches.map((v) => `[${v.name}](../../packages/domain/protocol/vectors/${v.name}.json)`).join(", ")}${serverMatches.length ? `; server: ${serverMatches.map((v) => v.name).join(", ")} ([server.json](../../packages/domain/protocol/server.json))` : ""} |`
  })
  return `# Operation vector audit\n\nGenerated by \`pnpm --filter @podlist/domain protocol\`; do not edit this table. Every row is an actual Operation.Change schema member. The test fails if a member lacks a committed replay vector; Library-dependent intentions also run through the real server and SQLite. New replay vectors contain a State checkpoint after every operation, including no-ops and duplicate deliveries.\n\n| Change | Vectors |\n| --- | --- |\n${rows.join("\n")}\n${purgeCompatibility}`
}
